from backend.schemas.interview_state import InterviewState
from typing import Dict, Any, List

class InterviewOrchestratorAgent:
    """
    Evidence-based Admissions Interview Orchestrator.
    Determines next action based on required evidence coverage, candidate score profiles,
    and turn count limits.
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
        """
        Evaluates candidate details and updates the evidence map, turn count,
        next action, target requirement, and maps back to the frontend phase.
        """
        from backend.tools.rag_retrieval_tool import rag_retriever

        # 1. Update turn count when a new answer is processed
        if len(state.answer_history) > state.turn_count:
            state.turn_count = len(state.answer_history)

        # Ensure all requirements exist in evidence_map
        for req in InterviewOrchestratorAgent.POLICY_REQUIREMENTS:
            if req not in state.evidence_map:
                state.evidence_map[req] = {
                    "status": "missing",
                    "confidence": 0.0,
                    "supporting_snippets": []
                }

        # 2. Update Evidence Map based on conversation Q&A history
        for q, a in zip(state.question_history, state.answer_history):
            if not a.strip():
                continue
            matched_cat = None
            # 1) Search in RAG questions database for exact match
            for rq in rag_retriever.questions:
                if rq["question"].strip("?. ").lower() == q.strip("?. ").lower():
                    matched_cat = rq["topic"]
                    break
            
            # 2) Fallback to checking if category name is in question
            if not matched_cat:
                for req in InterviewOrchestratorAgent.POLICY_REQUIREMENTS:
                    if req.lower() in q.lower():
                        matched_cat = req
                        break

            # 3) General fallback matching
            if not matched_cat:
                if "background" in q.lower() or "introduce" in q.lower():
                    matched_cat = "Candidate Background"
                elif "why" in q.lower() or "commit" in q.lower():
                    matched_cat = "Motivation & Commitment"

            if matched_cat and matched_cat in state.evidence_map:
                # If we matched the category, update the status to satisfied
                state.evidence_map[matched_cat] = {
                    "status": "satisfied",
                    "confidence": 0.85,
                    "supporting_snippets": [a]
                }

        # 3. Handle action and state transitions
        if len(state.question_history) == 0:
            # First Turn
            state.next_action = "ask_first_question"
            state.target_requirement = "Candidate Background"
            state.interview_phase = "INTRODUCTION"
            return state

        # If previous action was wrap_up and user answered again, mark complete
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

        # Check the last answer score to see if we should probe/follow up
        last_score_val = 5.0
        if state.scores:
            last_score_val = state.scores[-1].get("overall_score", 5.0)

        # Count consecutive attempts for the current target requirement
        consecutive_attempts = 0
        if state.target_requirement:
            if state.next_action == "ask_follow_up":
                consecutive_attempts = 1

        # Determine next action and target
        if last_score_val < 3.0 and consecutive_attempts < 1 and state.target_requirement:
            # Answer was weak. Ask a follow-up/probe once.
            state.next_action = "ask_follow_up"
        else:
            # Find the next unsatisfied requirement
            next_target = None
            for req in InterviewOrchestratorAgent.POLICY_REQUIREMENTS:
                if state.evidence_map[req]["status"] in ["missing", "weak"]:
                    next_target = req
                    break

            if next_target and state.turn_count < state.max_turns:
                state.target_requirement = next_target
                state.next_action = "switch_topic"
            else:
                # All satisfied or reached max turns
                state.next_action = "wrap_up"
                state.target_requirement = None

        # 4. Map back to frontend phase
        if state.next_action == "ask_first_question":
            state.interview_phase = "INTRODUCTION"
        elif state.next_action == "wrap_up":
            state.interview_phase = "WRAP_UP"
        elif state.next_action == "complete":
            state.interview_phase = "COMPLETED"
        elif state.target_requirement:
            state.interview_phase = InterviewOrchestratorAgent.PHASE_MAP.get(
                state.target_requirement, "BACKGROUND"
            )
        else:
            state.interview_phase = "BACKGROUND"

        return state


