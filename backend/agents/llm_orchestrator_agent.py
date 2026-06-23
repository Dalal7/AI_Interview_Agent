import os
import json
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from google import genai
from google.genai import types

from backend.schemas.interview_state import InterviewState
from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent

class EvidenceItemSchema(BaseModel):
    status: Literal["satisfied", "weak", "missing"] = Field(
        description="The completeness of evidence collected for this requirement"
    )
    confidence: float = Field(
        description="Confidence rating from 0.0 to 1.0 based on how clear the evidence is"
    )
    supporting_snippets: List[str] = Field(
        description="Extracts/quotes or summaries of candidate answers supporting this status"
    )

class LLMOrchestratorResultSchema(BaseModel):
    evidence_updates: Dict[str, EvidenceItemSchema] = Field(
        description="Updates to the evidence map for the 9 requirements. Keys MUST match the exact requirement names."
    )
    next_action: Literal["ask_first_question", "ask_follow_up", "switch_topic", "wrap_up", "complete"] = Field(
        description="The next routing action to take"
    )
    target_requirement: Optional[str] = Field(
        None,
        description="The requirement to target next. Must be one of the 9 requirements or null if wrapping up/complete."
    )

class LLMOrchestratorAgent:
    """
    LLM-based Admissions Interview Orchestrator.
    Determines next action, target requirement, and updates evidence map using Gemini-3.1-flash-lite.
    """

    # 13 Required admissions evidence items
    POLICY_REQUIREMENTS = [
        "Candidate Background",
        "Motivation & Commitment",
        "Learning & Problem Solving",
        "Teamwork & Collaboration",
        "Projects & Experience",
        "Python",
        "Machine Learning",
        "NLP",
        "Agentic AI",
        "RAG",
        "LLMs",
        "Git & GitHub",
        "Agentic AI Deep-Dive"
    ]

    # Map target requirement to standard frontend phase strings
    PHASE_MAP = {
        "Candidate Background": "BACKGROUND",
        "Motivation & Commitment": "BACKGROUND",
        "Learning & Problem Solving": "BACKGROUND",
        "Teamwork & Collaboration": "BACKGROUND",
        "Projects & Experience": "PROJECTS",
        "Python": "SKILLS",
        "Machine Learning": "TECHNICAL",
        "NLP": "TECHNICAL",
        "Agentic AI": "TECHNICAL",
        "RAG": "TECHNICAL",
        "LLMs": "TECHNICAL",
        "Git & GitHub": "SKILLS",
        "Agentic AI Deep-Dive": "TECHNICAL"
    }

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # 1. Update turn count when a new answer is processed
        if len(state.answer_history) > state.turn_count:
            state.turn_count = len(state.answer_history)

        # 2. First Turn Optimization (Deterministic Start)
        if len(state.question_history) == 0:
            state.next_action = "ask_first_question"
            state.target_requirement = "Candidate Background"
            state.interview_phase = "INTRODUCTION"
            return state

        # If previous action was wrap_up and user answered again, complete
        if state.next_action == "wrap_up" and len(state.answer_history) >= len(state.question_history):
            state.next_action = "complete"
            state.target_requirement = None
            state.interview_phase = "COMPLETED"
            state.interview_status = "completed"
            return state

        if state.next_action == "complete" or state.interview_status == "completed":
            state.next_action = "complete"
            state.target_requirement = None
            state.interview_phase = "COMPLETED"
            state.interview_status = "completed"
            return state

        # 3. Call LLM to decide next action, target, and evidence map
        api_key = os.getenv("GEMINI_API_KEY")
        result = None

        if api_key:
            # Build conversation history context
            history = []
            for q, a in zip(state.question_history, state.answer_history):
                history.append(f"Q: {q}\nA: {a}")
            history_text = "\n\n".join(history)

            # Build prompt
            prompt = f"""You are the Admissions Interview Orchestrator for a competitive software development bootcamp.
Your role is to update the candidate's evidence map, determine the next high-level action, and set the next target requirement.

Current Turn: {state.turn_count} / Maximum Turns: {state.max_turns}
Current Target Requirement: {state.target_requirement}
Last Action: {state.next_action}

Here are the 13 requirements you must track and verify:
{', '.join(LLMOrchestratorAgent.POLICY_REQUIREMENTS)}

Current Candidate Profile (extracted by ProfileBuilder):
{json.dumps(state.current_profile_data or {}, indent=2)}

Candidate Scores History (evaluated by EvaluationAgent):
{json.dumps(state.scores or [], indent=2)}

Full Conversation History:
{history_text}

Current Evidence Map state (to update):
{json.dumps(state.evidence_map or {}, indent=2)}

Instructions:
1. Update the evidence map. For each of the 13 requirements:
   - Mark as "satisfied" if the conversation shows the candidate has clear competence/experience/commitment for it.
   - Mark as "weak" if they answered but the answer was vague, incomplete, or below expectations.
   - Mark as "missing" if there is no evidence yet.
   - Set confidence (0.0 to 1.0) and include supporting snippets from the candidate's answers.
2. Select the next action:
   - "ask_follow_up": If the candidate's response to the last target requirement was weak, vague, or had a low score (e.g. < 3.0), and we haven't already asked a follow-up for this topic.
   - "switch_topic": If the current requirement is satisfied/sufficiently explored and there are other missing/weak requirements, choose a new target requirement.
   - "wrap_up": If all requirements are satisfied, or if we have reached or are about to exceed the turn limit.
3. Select the target_requirement (must be one of the 13 requirements listed above, or null/None if wrapping up/complete).

Format your output as a JSON object matching the requested schema.
"""
            try:
                client = genai.Client(api_key=api_key)
                print("==================== GEMINI ORCHESTRATOR REQUEST PROMPT ====================")
                print(prompt)
                print("==========================================================================")
                response = client.models.generate_content(
                    model="gemini-3.1-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=LLMOrchestratorResultSchema,
                        temperature=0.1
                    )
                )
                print("==================== GEMINI ORCHESTRATOR RESPONSE ========================")
                print(response.text)
                print("==========================================================================")
                result = json.loads(response.text.strip())
            except Exception as e:
                print(f"Error calling gemini-3.1-flash-lite in LLMOrchestratorAgent: {e}. Falling back to config orchestrator.")

        # 4. Fallback to deterministic rules if LLM fails or API Key is missing
        if not result:
            return InterviewOrchestratorAgent.run(state)

        # 5. Apply LLM results to state
        # Parse updates to evidence map
        evidence_updates = result.get("evidence_updates", {})
        for req in LLMOrchestratorAgent.POLICY_REQUIREMENTS:
            if req in evidence_updates:
                item = evidence_updates[req]
                state.evidence_map[req] = {
                    "status": item.get("status", "missing"),
                    "confidence": item.get("confidence", 0.0),
                    "supporting_snippets": item.get("supporting_snippets", [])
                }
            elif req not in state.evidence_map:
                state.evidence_map[req] = {
                    "status": "missing",
                    "confidence": 0.0,
                    "supporting_snippets": []
                }

        state.next_action = result.get("next_action", "switch_topic")
        state.target_requirement = result.get("target_requirement")

        # Double check turn constraints and target requirements
        if state.turn_count >= state.max_turns and state.next_action not in ["wrap_up", "complete"]:
            state.next_action = "wrap_up"
            state.target_requirement = None

        if state.next_action == "wrap_up":
            state.target_requirement = None

        # 6. Map back to frontend phase
        if state.next_action == "ask_first_question":
            state.interview_phase = "INTRODUCTION"
        elif state.next_action == "wrap_up":
            state.interview_phase = "WRAP_UP"
        elif state.next_action == "complete":
            state.interview_phase = "COMPLETED"
            state.interview_status = "completed"
        elif state.target_requirement:
            state.interview_phase = LLMOrchestratorAgent.PHASE_MAP.get(
                state.target_requirement, "BACKGROUND"
            )
        else:
            state.interview_phase = "BACKGROUND"

        return state
