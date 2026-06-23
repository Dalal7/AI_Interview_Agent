import os
from typing import Literal
from langchain_core.runnables import RunnableConfig
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END

# Import Schemas
from backend.schemas.interview_state import InterviewState

# Import Agents
from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent
from backend.agents.llm_orchestrator_agent import LLMOrchestratorAgent
from backend.agents.evaluation_agent import EvaluationAgent
from backend.agents.profile_builder_agent import ProfileBuilderAgent
from backend.agents.decision_support_agent import DecisionSupportAgent
from backend.agents.final_report_agent import FinalReportAgent
from backend.agents.email_agent import EmailAgent

# Import Tools
from backend.tools.question_generator_tool import QuestionGeneratorTool
from backend.tools.profile_storage_tool import ProfileStorageTool
from backend.tools.transcript_storage_tool import TranscriptStorageTool

# --------------------------------------------------
# LANGGRAPH NODES
# --------------------------------------------------

def orchestrator_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Orchestrator node updates the evidence map and transitions states."""
    strategy = getattr(state, "orchestration_strategy", "config")
    if strategy == "prompt":
        return LLMOrchestratorAgent.run(state)
    return InterviewOrchestratorAgent.run(state)

def evaluation_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Evaluates the candidate's last answer. Logs the interaction to the DB."""
    import time
    from backend.services.system_evaluation_service import SystemEvaluationService
    start = time.time()
    updated_state = EvaluationAgent.run(state)
    duration_ms = int((time.time() - start) * 1000)
    SystemEvaluationService.record_evaluation_time(duration_ms)

    db = (config.get("configurable") or {}).get("db")
    if db and len(updated_state.question_history) > 0 and len(updated_state.answer_history) > 0:
        try:
            TranscriptStorageTool.log_interaction(
                db=db,
                candidate_id=updated_state.candidate_id,
                question=updated_state.question_history[-1],
                answer=updated_state.answer_history[-1],
                scores=updated_state.scores[-1] if updated_state.scores else {}
            )
        except Exception as e:
            print(f"Error logging transcript: {e}")

    return updated_state

def profile_builder_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Extracts profile information and updates candidate details in database."""
    updated_state = ProfileBuilderAgent.run(state)

    db = (config.get("configurable") or {}).get("db")
    if db:
        try:
            ProfileStorageTool.save_profile(
                db=db,
                candidate_id=updated_state.candidate_id,
                profile_data=updated_state.current_profile_data
            )
        except Exception as e:
            print(f"Error saving profile: {e}")

    return updated_state

def question_generator_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Generates the next interview question using orchestrator fields."""
    next_q = QuestionGeneratorTool.generate_question(
        candidate_id=state.candidate_id,
        phase=state.interview_phase,
        profile_data=state.current_profile_data,
        question_history=state.question_history,
        answer_history=state.answer_history,
        next_action=state.next_action,
        target_requirement=state.target_requirement,
        evidence_map=state.evidence_map,
        interview_summary=state.interview_summary
    )

    state.question_history.append(next_q)
    state.messages.append({"role": "assistant", "content": next_q})
    return state

def final_report_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Runs the final admissions assessment and updates profile details."""
    updated_state = FinalReportAgent.run(state)

    db = (config.get("configurable") or {}).get("db")
    if db:
        try:
            ProfileStorageTool.save_profile(
                db=db,
                candidate_id=updated_state.candidate_id,
                profile_data=updated_state.current_profile_data
            )
        except Exception as e:
            print(f"Error saving final report: {e}")

    return updated_state

def email_sender_node(state: InterviewState, config: RunnableConfig) -> InterviewState:
    """Sends/Drafts an email to the candidate after report generation."""
    return EmailAgent.run(state)


# --------------------------------------------------
# CONDITIONAL ROUTING EDGES
# --------------------------------------------------

def entry_router(state: InterviewState) -> Literal["orchestrator", "evaluation"]:
    """
    Determines where to enter the graph:
    - If starting, go to orchestrator first.
    - If answering, go to evaluation first.
    """
    if len(state.answer_history) == 0:
        return "orchestrator"
    return "evaluation"

def orchestrator_router(state: InterviewState) -> Literal["question_generator", "final_report"]:
    """
    Routes from orchestrator based on the selected next action.
    """
    if state.next_action in ["wrap_up", "complete"]:
        return "final_report"
    return "question_generator"


# --------------------------------------------------
# GRAPH CONSTRUCTION
# --------------------------------------------------

workflow = StateGraph(InterviewState)

# Add Nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("evaluation", evaluation_node)
workflow.add_node("profile_builder", profile_builder_node)
workflow.add_node("question_generator", question_generator_node)
workflow.add_node("final_report", final_report_node)

# Set conditional entry point
workflow.set_conditional_entry_point(
    entry_router,
    {
        "orchestrator": "orchestrator",
        "evaluation": "evaluation"
    }
)

# Set edges
workflow.add_edge("evaluation", "profile_builder")
workflow.add_edge("profile_builder", "orchestrator")

workflow.add_conditional_edges(
    "orchestrator",
    orchestrator_router,
    {
        "question_generator": "question_generator",
        "final_report": "final_report"
    }
)

workflow.add_edge("question_generator", END)
workflow.add_edge("final_report", END)

# Compile Graph
interview_graph = workflow.compile()
