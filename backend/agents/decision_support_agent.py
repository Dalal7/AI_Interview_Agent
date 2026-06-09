from backend.schemas.interview_state import InterviewState

class DecisionSupportAgent:
    """
    Evaluates candidate performance to decide if we should transition
    interview phases, ask probing/deep questions, or conclude the session.
    """

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # If no scores exist yet, we keep the interview active
        if not state.scores:
            state.interview_status = "active"
            return state

        last_score_data = state.scores[-1]
        last_score = last_score_data.get("overall_score", 0.0)
        current_phase = state.interview_phase.upper()

        # Rules:
        # 1. Check if we are in WRAP_UP and the user has answered. If so, end the interview.
        if current_phase == "WRAP_UP" and len(state.answer_history) >= len(state.question_history):
            state.interview_phase = "COMPLETED"
            state.interview_status = "completed"
            return state

        if current_phase == "COMPLETED":
            state.interview_status = "completed"
            return state

        # 2. Count turns in the current phase to prevent infinite loops
        phase_turns = sum(1 for q in state.question_history if current_phase in q.upper() or 
                          (current_phase == "BACKGROUND" and ("background" in q.lower() or "transition" in q.lower())) or
                          (current_phase == "SKILLS" and ("languages" in q.lower() or "skills" in q.lower())) or
                          (current_phase == "PROJECTS" and ("project" in q.lower() or "stack" in q.lower())) or
                          (current_phase == "TECHNICAL" and ("database" in q.lower() or "recursion" in q.lower() or "rendering" in q.lower()))
                         )

        # 3. Transition logic:
        # If we have run at least 1 turn for this phase and the answer is strong (>= 3.5), we can move on
        # Or if we have run 2 turns, we must move on to keep the interview within reasonable limits (e.g. 5-7 questions total)
        if phase_turns >= 2 or (phase_turns >= 1 and last_score >= 3.5):
            # Transition to next phase
            phases = ["INTRODUCTION", "BACKGROUND", "SKILLS", "PROJECTS", "TECHNICAL", "WRAP_UP", "COMPLETED"]
            try:
                curr_idx = phases.index(current_phase)
                next_phase = phases[curr_idx + 1]
                state.interview_phase = next_phase
                
                # If the next phase is COMPLETED, set status
                if next_phase == "COMPLETED":
                    state.interview_status = "completed"
            except ValueError:
                state.interview_phase = "WRAP_UP"
        else:
            # Keep in active phase, but we can set hints in state or logs for the question generator
            # e.g., if last_score < 3.0: ask easier follow-up; if last_score >= 4.0: ask deeper question.
            pass

        return state
