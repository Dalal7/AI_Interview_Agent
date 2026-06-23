import os
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from backend.database.repository import InterviewRepository
from backend.database.session import get_db

router = APIRouter(prefix="/blueprint", tags=["Blueprint Designer"])

SYSTEM_INSTRUCTION = """You are a senior full-stack engineer and product architect. You act as an Interview Blueprint Compiler Assistant.
The user wants to construct or modify an 'InterviewBlueprint' state.

You are given:
1. The current state of the InterviewBlueprint (JSON).
2. The conversation history.
3. The latest user input.

Your task is to:
1. Analyze the user's input to understand their request (e.g., adding competencies, changing duration, editing decision thresholds, adjusting tone, setting minimum requirements, etc.).
2. Update the 'InterviewBlueprint' state. Return ONLY the fields that are being modified or added in 'blueprintUpdate'. Do NOT include unchanged fields. Make sure all values follow the schema types exactly.
3. Suggest improvements or ask follow-up questions to fill out missing details.
4. Output your response STRICTLY as a JSON object matching this schema:
{
  "message": "AI conversational message addressing the user, explaining changes, suggesting enhancements, and asking follow-up questions.",
  "blueprintUpdate": {
    // ONLY the partial fields of the InterviewBlueprint that should be merged/updated.
    // E.g. { "program": { "name": "New Name" } } or { "competencies": [...] }
  },
  "suggestedQuestions": ["Short query option 1", "Short query option 2", "Short query option 3"],
  "validationWarnings": ["Warning description 1", "Warning description 2"]
}

Rules:
- Never break the JSON structure.
- Never output raw JSON in the "message" text block.
- For lists/arrays (like competencies, minimum_requirements, sections), if the user wants to add one, append it to the existing list in your 'blueprintUpdate' (you are given the current state, so merge it yourself and return the new array in 'blueprintUpdate'). If the user says 'remove X', return the new array without X in 'blueprintUpdate'.
- Check that:
  - Competency weights should ideally sum to 100%.
  - Interview total duration matches the sum of sections.
  - Required fields are filled out.
  - Scoring weights (technical, communication, problem_solving) sum to 100.
  - Decision rules auto-accept and auto-reject thresholds align with the overall scale.
  If there are issues, report them in the 'validationWarnings' array.

TypeScript Schema Reference:
interface InterviewBlueprint {
  program: {
    name: string;
    description: string;
    type: string;
    duration_weeks: number;
    cohort_size: number;
  };
  candidate_profile: {
    target_audience: string[];
    experience_level: string;
    minimum_requirements: string[];
  };
  interview_objective: {
    purpose: string;
    success_definition: string;
  };
  interview_structure: {
    type: "structured" | "semi_structured" | "adaptive";
    total_duration_minutes: number;
    sections: {
      name: string;
      duration_minutes: number;
      objective: string;
      focus_competencies: string[];
    }[];
  };
  competencies: {
    name: string;
    weight: number;
    description: string;
  }[];
  skills: {
    required: string[];
    preferred: string[];
    bonus: string[];
  };
  question_strategy: {
    mode: "fixed" | "bank" | "ai_generated" | "hybrid";
    adaptive_enabled: boolean;
    follow_up_depth_limit: number;
  };
  evaluation_rubric: {
    criteria: {
      name: string;
      weight: number;
      scale: "0-5" | "0-10" | "0-100";
    }[];
  };
  scoring: {
    overall_scale: number;
    pass_threshold: number;
    weights: {
      technical: number;
      communication: number;
      problem_solving: number;
    };
  };
  decision_rules: {
    auto_accept_threshold: number;
    auto_reject_threshold: number;
    human_review_range: { min: number; max: number };
  };
  agent_configuration: {
    tone: "professional" | "friendly" | "formal" | "encouraging";
    verbosity: "low" | "medium" | "high";
    language: string;
  };
}
"""

class BlueprintSaveRequest(BaseModel):
    blueprint: Dict[str, Any]

class BlueprintChatRequest(BaseModel):
    blueprint: Dict[str, Any]
    messages: List[Dict[str, Any]]
    prompt: str

@router.get("")
def get_blueprint(db: Session = Depends(get_db)):
    blueprint = InterviewRepository.get_blueprint(db)
    return {"blueprint": blueprint}

@router.post("")
def save_blueprint(payload: BlueprintSaveRequest, db: Session = Depends(get_db)):
    db_blueprint = InterviewRepository.save_blueprint(db, payload.blueprint)
    return {"status": "success", "blueprint": payload.blueprint}

@router.delete("")
def delete_blueprint(db: Session = Depends(get_db)):
    deleted = InterviewRepository.delete_blueprint(db)
    return {"status": "success", "deleted": deleted}

@router.post("/chat")
def chat_blueprint(payload: BlueprintChatRequest):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY is not configured on the server."
        )

    chat_history_lines = []
    for m in payload.messages[-10:]:
        role = "User" if m.get("role") == "user" else "Assistant"
        chat_history_lines.append(f"{role}: {m.get('content')}")
    chat_history = "\n\n".join(chat_history_lines)

    input_context = f"""
=== CURRENT INTERVIEW BLUEPRINT ===
{json.dumps(payload.blueprint, indent=2)}

=== RECENT CHAT HISTORY ===
{chat_history}

=== LATEST USER INPUT ===
{payload.prompt}

=== INSTRUCTIONS ===
Update the blueprint according to the latest user input and return the structured JSON containing "message", "blueprintUpdate", "suggestedQuestions", and "validationWarnings".
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=input_context,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
                system_instruction=SYSTEM_INSTRUCTION
            )
        )
        result = json.loads(response.text)
        return result
    except Exception as e:
        print(f"Error compiling blueprint in python: {e}")
        return {
            "message": f"Sorry, I had an error updating the blueprint: {str(e)}. Please try rephrasing.",
            "blueprintUpdate": {},
            "suggestedQuestions": ["Let's change the duration to 30 minutes.", "Add Python to skills."],
            "validationWarnings": [f"Gemini call error: {str(e)}"]
        }
