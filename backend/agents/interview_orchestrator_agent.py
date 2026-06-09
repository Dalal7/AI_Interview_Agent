from backend.schemas.interview_state import InterviewState

class InterviewOrchestratorAgent:
    """
    Manages the progress of the interview phases and determines if transitions
    should occur.
    Phases: INTRODUCTION -> BACKGROUND -> SKILLS -> PROJECTS -> TECHNICAL -> WRAP_UP -> COMPLETED
    """

    PHASES = ["INTRODUCTION", "BACKGROUND", "SKILLS", "PROJECTS", "TECHNICAL", "WRAP_UP", "COMPLETED"]

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        """
        Evaluates current state progress and adjusts interview_phase if necessary.
        """
        current_phase = state.interview_phase.upper()
        
        # Determine transition conditions
        if current_phase == "INTRODUCTION":
            # Transition to BACKGROUND once we have basic info (name, email)
            profile = state.current_profile_data
            if profile.get("candidate_name") and profile.get("email"):
                state.interview_phase = "BACKGROUND"
            elif len(state.answer_history) >= 1:
                # If they answered the intro question, transition
                state.interview_phase = "BACKGROUND"

        elif current_phase == "BACKGROUND":
            # Move to SKILLS after at least one question-answer round in BACKGROUND
            # Or if background data is successfully extracted
            bg_turns = sum(1 for q, a in zip(state.question_history, state.answer_history) if "background" in q.lower() or "transition" in q.lower())
            if bg_turns >= 1 or (state.current_profile_data.get("background") and len(state.current_profile_data.get("background")) > 0):
                state.interview_phase = "SKILLS"

        elif current_phase == "SKILLS":
            # Move to PROJECTS once we have a list of skills or at least one skills Q&A turn
            skills_turns = sum(1 for q, a in zip(state.question_history, state.answer_history) if "language" in q.lower() or "skills" in q.lower() or "rendering" in q.lower())
            if skills_turns >= 1 or len(state.detected_skills) >= 2:
                state.interview_phase = "PROJECTS"

        elif current_phase == "PROJECTS":
            # Move to TECHNICAL once we've covered projects
            project_turns = sum(1 for q, a in zip(state.question_history, state.answer_history) if "project" in q.lower() or "stack" in q.lower() or "challenges" in q.lower())
            if project_turns >= 1 or (state.current_profile_data.get("projects") and len(state.current_profile_data.get("projects")) > 0):
                state.interview_phase = "TECHNICAL"

        elif current_phase == "TECHNICAL":
            # Move to WRAP_UP after technical questions are completed (usually 1-2 technical questions)
            tech_turns = sum(1 for q in state.question_history if "database" in q.lower() or "recursion" in q.lower() or "auth" in q.lower() or "server-side" in q.lower())
            if tech_turns >= 1:
                state.interview_phase = "WRAP_UP"

        elif current_phase == "WRAP_UP":
            # Move to COMPLETED
            if len(state.answer_history) > len(state.question_history):
                # If the user has sent their final response, mark completed
                state.interview_phase = "COMPLETED"
                state.interview_status = "completed"

        # Safe guard boundary
        if state.interview_phase not in InterviewOrchestratorAgent.PHASES:
            state.interview_phase = "INTRODUCTION"

        return state
