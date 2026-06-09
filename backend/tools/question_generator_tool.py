import os
from google import genai
from backend.tools.rag_retrieval_tool import rag_retriever

class QuestionGeneratorTool:
    """
    Formulates the next interview question using gemini-2.5-flash,
    incorporating the current phase, candidate profile, history, and RAG contexts.
    """

    @staticmethod
    def generate_question(
        candidate_id: str,
        phase: str,
        profile_data: dict,
        question_history: list,
        answer_history: list
    ) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        
        # 1. Query RAG for suggested questions matching the current phase
        query_context = ""
        if question_history:
            query_context = question_history[-1]
        
        rag_suggestions = rag_retriever.retrieve_questions(query=query_context, phase=phase, top_k=2)
        rag_text = "\n".join([f"- {q['question']} (Keywords: {q['keywords']})" for q in rag_suggestions])

        # 2. Formulate system guidelines based on the active phase
        phase_instructions = {
            "INTRODUCTION": "Welcome the candidate, introduce yourself as the Admissions AI Screener for the Bootcamp. Ask them to share their name, email, and a brief summary of what brings them here today.",
            "BACKGROUND": "Probe their professional/personal background, education, and career motivations. Ask what inspired them to transition to software development.",
            "SKILLS": "Inquire about their technical skillset. Ask what programming languages they know, how comfortable they are, and their familiarity with full-stack concepts.",
            "PROJECTS": "Ask them to describe a coding project they are proud of. Prompt for details about the tech stack, what challenges they overcame, and what they learned.",
            "TECHNICAL": "Propose a coding or design question (e.g., database schema design, recursion pitfalls, or Next.js rendering comparison). Probe for their technical execution and debugging approach.",
            "WRAP_UP": "Inform the candidate that the screening is complete. Explain that their profile is being processed and will be reviewed by the admissions team shortly. Offer warm closing remarks.",
            "COMPLETED": "The interview is already fully completed. Thank them again and bid them farewell."
        }

        instruction = phase_instructions.get(phase.upper(), "Ask a general follow-up question to learn more about the candidate.")

        # Format history
        history_text = ""
        for q, a in zip(question_history, answer_history):
            history_text += f"Q: {q}\nA: {a}\n"

        prompt = f"""You are the Question Generator Tool for an Autonomous Bootcamp Admissions Agent.
Your task is to generate the NEXT natural and engaging interview question for a candidate.

Current Phase: {phase}
Admissions Guideline for this Phase: {instruction}

Candidate Profile (extracted so far):
{profile_data}

Previous Q&A Turns in this session:
{history_text}

RAG Suggestion Bank questions for this phase:
{rag_text}

Instructions:
1. Generate exactly one question.
2. Maintain a friendly, supportive, yet professional recruiter tone.
3. Incorporate context from their profile or previous answers if they shared something interesting (e.g. if they mentioned a Python project, follow up or reference it).
4. If this is the INTRODUCTION, do not refer to a profile yet since it is empty. Simply welcome them.
5. If the previous answer was weak, ask a slightly easier/probing question. If the previous answer was strong, ask a deeper follow-up.
6. Return only the raw text of the question. Do not add labels like "Question:" or markdown formatting.
"""

        # 3. Call Gemini 2.5 Flash
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                return response.text.strip()
            except Exception as e:
                print(f"Error calling gemini-2.5-flash for question generation: {e}. Falling back to RAG default.")

        # 4. Fallback: return first RAG suggestion if API fails or is not available
        if rag_suggestions:
            return rag_suggestions[0]["question"]
        
        # Universal fallback
        fallback_questions = {
            "INTRODUCTION": "Welcome! To start, could you please tell me your name, email, and why you are interested in joining our coding bootcamp?",
            "BACKGROUND": "Could you share a bit about your education or work background and how it led you to programming?",
            "SKILLS": "What programming languages or web frameworks have you worked with, and how would you describe your comfort level?",
            "PROJECTS": "Tell me about a project you built. What technologies did you use, and what challenges did you encounter?",
            "TECHNICAL": "How would you explain the difference between client-side rendering (CSR) and server-side rendering (SSR)?",
            "WRAP_UP": "Thank you so much for your time today! That wraps up our interview. The admissions dashboard will update with your report shortly.",
        }
        return fallback_questions.get(phase.upper(), "How do you approach learning new technical skills when you get stuck?")
