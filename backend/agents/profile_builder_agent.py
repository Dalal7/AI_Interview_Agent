import os
import re
import json
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from backend.schemas.interview_state import InterviewState
from backend.tools.rag_retrieval_tool import rag_retriever

class ProfileBuilderResponseSchema(BaseModel):
    candidate_name: Optional[str] = Field(None, description="Extracted candidate full name")
    email: Optional[str] = Field(None, description="Extracted candidate email address")
    education: Optional[str] = Field(None, description="Summary of candidate education/certifications")
    background: Optional[str] = Field(None, description="Summary of candidate professional experience and background")
    skills: List[str] = Field(default_factory=list, description="List of programming languages or technical tools mentioned")
    projects: List[str] = Field(default_factory=list, description="List of coding projects mentioned")
    missing_requirements: List[str] = Field(
        default_factory=list,
        description="Bootcamp requirements not yet addressed (e.g. 'Time Commitment', 'Web Basics', 'Core Coding Knowledge')"
    )

class ProfileBuilderAgent:
    """
    Extracts candidate profile fields (skills, projects, background, education)
    using gemini-2.5-flash. Keeps the interview state's current_profile_data
    and missing_requirements up to date.
    """

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # Format conversation transcript
        transcript = ""
        for q, a in zip(state.question_history, state.answer_history):
            transcript += f"Interviewer: {q}\nCandidate: {a}\n\n"
        
        # Add the latest answer if it hasn't been paired yet
        if len(state.answer_history) > len(state.question_history):
            transcript += f"Candidate: {state.answer_history[-1]}"

        # Load program requirements from RAG for context
        program_reqs = rag_retriever.retrieve_requirements(query="bootcamp admission requirements", top_k=5)
        reqs_text = "\n".join([f"- {r['requirement']}: {r['description']}" for r in program_reqs])

        prompt = f"""You are an advanced information extraction agent for a coding bootcamp admissions platform.
Your task is to analyze the conversation transcript below, extract candidate profile details, and identify any missing bootcamp requirements.

Program Requirements:
{reqs_text}

Active Conversation Transcript:
{transcript}

Current Profile Data (for reference):
{state.current_profile_data}

Instructions:
1. Extract any new education details, background info, skills, projects, and names/emails.
2. Maintain and merge fields from the 'Current Profile Data' if they are already known and not updated.
3. Compare the candidate's answers against the Program Requirements. List the short titles of requirements that the candidate has NOT yet discussed (e.g., if they haven't mentioned how much time they can devote, list 'Time Commitment' as missing).
4. Return the result strictly in JSON matching the requested schema.
"""

        api_key = os.getenv("GEMINI_API_KEY")
        extracted = None

        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ProfileBuilderResponseSchema,
                        temperature=0.1
                    )
                )
                extracted = json.loads(response.text.strip())
            except Exception as e:
                print(f"Error calling gemini-2.5-flash in ProfileBuilderAgent: {e}. Falling back to regex extraction.")

        # Fallback profile builder if LLM fails or API Key is missing
        if not extracted:
            extracted = ProfileBuilderAgent._fallback_extraction(state)

        # Merge extracted data into the state
        profile = state.current_profile_data or {}
        
        # Merge basic string attributes
        for key in ["candidate_name", "email", "education", "background"]:
            if extracted.get(key):
                profile[key] = extracted[key]

        # Merge list attributes ensuring uniqueness
        for list_key in ["skills", "projects"]:
            existing_items = profile.get(list_key, [])
            if isinstance(existing_items, str):
                try:
                    existing_items = json.loads(existing_items)
                except Exception:
                    existing_items = [existing_items] if existing_items else []

            new_items = extracted.get(list_key, [])
            merged = list(set(existing_items + new_items))
            profile[list_key] = merged
            
            if list_key == "skills":
                state.detected_skills = merged

        state.current_profile_data = profile
        state.missing_requirements = extracted.get("missing_requirements", [])

        return state

    @staticmethod
    def _fallback_extraction(state: InterviewState) -> dict:
        """
        Extracts basic data like email and name using regexes and keyword matching,
        and manages program requirements checklists.
        """
        all_text = " ".join(state.answer_history)
        
        # 1. Name & Email extraction (regex)
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', all_text)
        email = email_match.group(0) if email_match else None

        # Look for name patterns (e.g., "My name is John Doe" or "I am John")
        name = None
        name_match = re.search(r'(?:my name is|i am|i\'m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', all_text, re.IGNORECASE)
        if name_match:
            name = name_match.group(1)
        elif len(state.answer_history) > 0 and not state.question_history:
            # First response might just be a name
            words = state.answer_history[0].strip().split()
            if len(words) <= 3:
                name = " ".join(words)

        # 2. Skill keyword extraction
        skills_keywords = {
            "Python": ["python", "django", "flask", "fastapi"],
            "JavaScript": ["javascript", "js", "node"],
            "TypeScript": ["typescript", "ts"],
            "React": ["react", "nextjs", "next.js", "jsx"],
            "HTML/CSS": ["html", "css", "tailwind"],
            "SQL/PostgreSQL": ["sql", "postgres", "postgresql", "database", "sqlite"]
        }
        
        extracted_skills = []
        for skill, kw_list in skills_keywords.items():
            for kw in kw_list:
                if kw in all_text.lower():
                    extracted_skills.append(skill)
                    break

        # 3. Project keyword extraction
        projects = []
        project_keywords = ["built", "project", "app", "application", "website", "developed"]
        for ans in state.answer_history:
            if any(pk in ans.lower() for pk in project_keywords) and len(ans.split()) > 15:
                # Add a truncated snippet of the answer as a project description
                snippet = ans[:60] + "..." if len(ans) > 60 else ans
                projects.append(snippet)

        # 4. Check for missing requirements
        missing = ["Core Coding Knowledge", "Time Commitment", "Web Basics", "Database Fundamentals", "Problem Solving Mindset"]
        
        # If skills are found, we have web basics or core coding
        if extracted_skills:
            if "HTML/CSS" in extracted_skills or "React" in extracted_skills:
                if "Web Basics" in missing:
                    missing.remove("Web Basics")
            if "Python" in extracted_skills or "JavaScript" in extracted_skills:
                if "Core Coding Knowledge" in missing:
                    missing.remove("Core Coding Knowledge")
        
        if "SQL/PostgreSQL" in extracted_skills:
            if "Database Fundamentals" in missing:
                missing.remove("Database Fundamentals")

        # Time commitment
        time_keywords = ["hour", "week", "schedule", "full time", "part time", "dedicate"]
        if any(tk in all_text.lower() for tk in time_keywords):
            if "Time Commitment" in missing:
                missing.remove("Time Commitment")

        # Problem solving
        solve_keywords = ["debug", "problem", "solve", "challeng", "fix", "error"]
        if any(sk in all_text.lower() for sk in solve_keywords):
            if "Problem Solving Mindset" in missing:
                missing.remove("Problem Solving Mindset")

        return {
            "candidate_name": name,
            "email": email,
            "education": "Degree details discussed" if "degree" in all_text.lower() or "university" in all_text.lower() else None,
            "background": "Professional transition details shared" if "transition" in all_text.lower() or "job" in all_text.lower() else None,
            "skills": extracted_skills,
            "projects": projects,
            "certifications": [],
            "missing_requirements": missing
        }
