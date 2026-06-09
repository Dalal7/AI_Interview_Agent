import os
from typing import Dict, Any, Literal
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END

# Import Schemas
from backend.schemas.interview_state import InterviewState

# Import Agents
from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent
from backend.agents.evaluation_agent import EvaluationAgent
from backend.agents.profile_builder_agent import ProfileBuilderAgent
from backend.agents.decision_support_agent import DecisionSupportAgent
from backend.agents.final_report_agent import FinalReportAgent

# Import Tools
from backend.tools.question_generator_tool import QuestionGeneratorTool
from backend.tools.profile_storage_tool import ProfileStorageTool
from backend.tools.transcript_storage_tool import TranscriptStorageTool

# --------------------------------------------------
# LANGGRAPH NODES
# --------------------------------------------------

def orchestrator_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Orchestrator node updates the interview phase based on candidate answers.
    """
    updated_state = InterviewOrchestratorAgent.run(state)
    return updated_state

def evaluation_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Evaluates the candidate's last answer. Logs the interaction to the DB.
    """
    updated_state = EvaluationAgent.run(state)
    
    # Log the turn interaction in the database if db is provided in config
    db = config.get("configurable", {}).get("db")
    if db and len(updated_state.question_history) > 0 and len(updated_state.answer_history) > 0:
        candidate_id = updated_state.candidate_id
        last_q = updated_state.question_history[-1]
        last_a = updated_state.answer_history[-1]
        last_score = updated_state.scores[-1] if updated_state.scores else {}
        
        try:
            TranscriptStorageTool.log_interaction(
                db=db,
                candidate_id=candidate_id,
                question=last_q,
                answer=last_a,
                scores=last_score
            )
        except Exception as e:
            print(f"Error logging transcript to database in evaluation_node: {e}")

    return updated_state

def profile_builder_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Extracts profile information and updates candidate details in database.
    """
    updated_state = ProfileBuilderAgent.run(state)
    
    # Save the updated profile to the DB
    db = config.get("configurable", {}).get("db")
    if db:
        candidate_id = updated_state.candidate_id
        try:
            ProfileStorageTool.save_profile(
                db=db,
                candidate_id=candidate_id,
                profile_data=updated_state.current_profile_data
            )
        except Exception as e:
            print(f"Error saving candidate profile in profile_builder_node: {e}")

    return updated_state

def decision_support_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Evaluates scores and determines if the session should conclude.
    """
    updated_state = DecisionSupportAgent.run(state)
    return updated_state

def question_generator_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Generates the next question.
    """
    next_q = QuestionGeneratorTool.generate_question(
        candidate_id=state.candidate_id,
        phase=state.interview_phase,
        profile_data=state.current_profile_data,
        question_history=state.question_history,
        answer_history=state.answer_history
    )
    
    # Append the question to history and add it to messages
    state.question_history.append(next_q)
    state.messages.append({"role": "assistant", "content": next_q})
    
    return state

def final_report_node(state: InterviewState, config: Dict[str, Any]) -> InterviewState:
    """
    Runs the final admissions assessment and updates profile details.
    """
    updated_state = FinalReportAgent.run(state)
    
    # Save the final profile report to DB
    db = config.get("configurable", {}).get("db")
    if db:
        candidate_id = updated_state.candidate_id
        try:
            ProfileStorageTool.save_profile(
                db=db,
                candidate_id=candidate_id,
                profile_data=updated_state.current_profile_data
            )
        except Exception as e:
            print(f"Error saving final admissions report in final_report_node: {e}")

    return updated_state

# --------------------------------------------------
# CONDITIONAL ROUTING EDGES
# --------------------------------------------------

def orchestrator_router(state: InterviewState) -> Literal["question_generator", "evaluation"]:
    """
    Routes from Orchestrator:
    - If a new answer has been provided, evaluate it first.
    - Otherwise (such as at start), generate a question directly.
    """
    if len(state.answer_history) < len(state.question_history):
        # We are waiting for candidate response, or just start
        return "question_generator"
    elif len(state.answer_history) == 0:
        # Initial state
        return "question_generator"
    else:
        # A new candidate response needs evaluation
        return "evaluation"

def decision_router(state: InterviewState) -> Literal["final_report", "orchestrator"]:
    """
    Routes from Decision Support Agent:
    - If the interview has been marked COMPLETED, generate the final report.
    - Otherwise, loop back to the orchestrator to plan the next question.
    """
    if state.interview_status == "completed" or state.interview_phase.upper() == "COMPLETED":
        return "final_report"
    return "orchestrator"

# --------------------------------------------------
# GRAPH CONSTRUCTION
# --------------------------------------------------

workflow = StateGraph(InterviewState)

# Add Nodes
workflow.add_node("orchestrator", orchestrator_node)
workflow.add_node("evaluation", evaluation_node)
workflow.add_node("profile_builder", profile_builder_node)
workflow.add_node("decision_support", decision_support_node)
workflow.add_node("question_generator", question_generator_node)
workflow.add_node("final_report", final_report_node)

# Set entry point
workflow.set_entry_point("orchestrator")

# Add Routing Edges
workflow.add_conditional_edges(
    "orchestrator",
    orchestrator_router,
    {
        "question_generator": "question_generator",
        "evaluation": "evaluation"
    }
)

workflow.add_edge("evaluation", "profile_builder")
workflow.add_edge("profile_builder", "decision_support")

workflow.add_conditional_edges(
    "decision_support",
    decision_router,
    {
        "final_report": "final_report",
        "orchestrator": "orchestrator"
    }
)

workflow.add_edge("question_generator", END)
workflow.add_edge("final_report", END)

# Compile Graph
interview_graph = workflow.compile()
