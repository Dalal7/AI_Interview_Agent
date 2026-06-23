import pytest
from unittest.mock import patch
from backend.schemas.interview_state import InterviewState
from backend.agents.llm_orchestrator_agent import LLMOrchestratorAgent
from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent

def test_llm_orchestrator_empty_state_deterministic():
    """
    The LLM orchestrator should handle empty state/first turn deterministically without calling LLM.
    """
    state = InterviewState(
        messages=[],
        question_history=[],
        answer_history=[],
        current_profile_data={},
        missing_requirements=["Motivation & Commitment"],
        interview_phase="INTRODUCTION",
        orchestration_strategy="prompt"
    )
    
    updated = LLMOrchestratorAgent.run(state)
    assert updated.next_action == "ask_first_question"
    assert updated.target_requirement == "Candidate Background"
    assert updated.interview_phase == "INTRODUCTION"

@patch("backend.agents.llm_orchestrator_agent.genai.Client")
def test_llm_orchestrator_fallback_on_exception(mock_genai_client):
    """
    If the genai client fails, the LLMOrchestratorAgent should fallback to the InterviewOrchestratorAgent logic.
    """
    # Force genai.Client to raise an exception
    mock_genai_client.side_effect = Exception("API Key Error or Network Timeout")
    
    profile = {
        "candidate_name": "Jane",
        "email": "jane@test.com",
        "background": "Software engineer transition",
        "education": "BS in CS"
    }
    state = InterviewState(
        messages=[{"role": "assistant", "content": "Tell me about your background."}],
        question_history=["Tell me about your background."],
        answer_history=["I have a background in physics and education."],
        current_profile_data=profile,
        missing_requirements=["Motivation & Commitment"],
        interview_phase="BACKGROUND",
        next_action="switch_topic",
        target_requirement="Candidate Background",
        turn_count=1,
        orchestration_strategy="prompt"
    )
    
    # Pre-populate evidence map to match config requirements
    for req in LLMOrchestratorAgent.POLICY_REQUIREMENTS:
        state.evidence_map[req] = {
            "status": "missing",
            "confidence": 0.0,
            "supporting_snippets": []
        }
    
    # Under fallback, Candidate Background is satisfied due to profile background
    updated = LLMOrchestratorAgent.run(state)
    
    # Confirm it ran the config-based logic successfully
    assert updated.target_requirement == "Motivation & Commitment"
    assert updated.next_action == "switch_topic"

def test_llm_orchestrator_integration_api_call():
    """
    Optional integration test calling the real LLM (only runs if GEMINI_API_KEY is present).
    """
    import os
    if not os.getenv("GEMINI_API_KEY"):
        pytest.skip("GEMINI_API_KEY environment variable not set. Skipping integration test.")
        
    profile = {
        "candidate_name": "Test LLM Candidate",
        "email": "llm@test.com",
        "background": "Bootcamp candidate with basic python",
        "education": "High school diploma"
    }
    
    state = InterviewState(
        messages=[
            {"role": "assistant", "content": "Welcome! Please tell me your background and motivation."},
            {"role": "user", "content": "I want to join the bootcamp because I want a new job and I have been learning Python on Coursera."}
        ],
        question_history=["Welcome! Please tell me your background and motivation."],
        answer_history=["I want to join the bootcamp because I want a new job and I have been learning Python on Coursera."],
        current_profile_data=profile,
        missing_requirements=["Python", "Motivation & Commitment"],
        interview_phase="BACKGROUND",
        next_action="switch_topic",
        target_requirement="Candidate Background",
        turn_count=1,
        orchestration_strategy="prompt"
    )
    
    updated = LLMOrchestratorAgent.run(state)
    
    # Check that LLM filled in some evidence updates and returned next action/target
    assert updated.evidence_map is not None
    assert updated.next_action in ["ask_follow_up", "switch_topic", "wrap_up", "complete"]
    assert updated.target_requirement is not None or updated.next_action == "wrap_up"
