import pytest
from backend.schemas.interview_state import InterviewState
from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent

def test_orchestrator_empty_state():
    """
    1. Empty state should produce the intro question action.
    """
    state = InterviewState(
        messages=[],
        question_history=[],
        answer_history=[],
        current_profile_data={},
        missing_requirements=["Motivation & Commitment"],
        interview_phase="INTRODUCTION"
    )
    
    updated = InterviewOrchestratorAgent.run(state)
    assert updated.next_action == "ask_first_question"
    assert updated.target_requirement == "Candidate Background"
    assert updated.interview_phase == "INTRODUCTION"

def test_orchestrator_missing_time_commitment():
    """
    2. Missing commitment becomes a targeted requirement if previous is satisfied.
    """
    # Candidate Background is satisfied, next is Motivation & Commitment
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
        turn_count=1
    )
    
    updated = InterviewOrchestratorAgent.run(state)
    assert updated.target_requirement == "Motivation & Commitment"
    assert updated.next_action == "switch_topic"
    assert updated.interview_phase == "BACKGROUND"

def test_orchestrator_weak_score_triggers_follow_up():
    """
    3. Weak technical score (< 3.0) triggers follow-up.
    """
    profile = {
        "candidate_name": "Jane",
        "email": "jane@test.com",
        "background": "Transition",
        "education": "Degree"
    }
    state = InterviewState(
        messages=[
            {"role": "assistant", "content": "Do you have time for this bootcamp?"},
            {"role": "user", "content": "Maybe."}
        ],
        question_history=["Do you have time for this bootcamp?"],
        answer_history=["Maybe."],
        current_profile_data=profile,
        missing_requirements=["Motivation & Commitment"],
        interview_phase="BACKGROUND",
        next_action="switch_topic",
        target_requirement="Motivation & Commitment",
        scores=[{"overall_score": 2.0}], # low score
        turn_count=1
    )
    
    updated = InterviewOrchestratorAgent.run(state)
    # Since score < 3.0 and consecutive_attempts < 1, it should ask a follow-up
    assert updated.next_action == "ask_follow_up"
    assert updated.target_requirement == "Motivation & Commitment"

def test_orchestrator_strong_score_advances():
    """
    4. Strong answer (> 3.5) advances to the next evidence gap.
    """
    profile = {
        "candidate_name": "Jane",
        "email": "jane@test.com",
        "background": "Transition",
        "education": "Degree"
    }
    state = InterviewState(
        messages=[
            {"role": "assistant", "content": "Tell me about your project."},
            {"role": "user", "content": "I built a tasks dashboard using Next.js."}
        ],
        question_history=["Tell me about your project."],
        answer_history=["I built a tasks dashboard using Next.js."],
        current_profile_data=profile,
        missing_requirements=["Python"], # Python is still missing
        interview_phase="PROJECTS",
        next_action="switch_topic",
        target_requirement="Projects & Experience",
        scores=[{"overall_score": 4.5}], # strong score
        turn_count=1
    )
    
    # Pre-populate prior requirements as satisfied in state.evidence_map so it finds the next one
    state.evidence_map["Candidate Background"] = {"status": "satisfied", "confidence": 0.9, "supporting_snippets": []}
    state.evidence_map["Motivation & Commitment"] = {"status": "satisfied", "confidence": 0.9, "supporting_snippets": []}
    state.evidence_map["Learning & Problem Solving"] = {"status": "satisfied", "confidence": 0.9, "supporting_snippets": []}
    state.evidence_map["Teamwork & Collaboration"] = {"status": "satisfied", "confidence": 0.9, "supporting_snippets": []}
    state.evidence_map["Projects & Experience"] = {"status": "satisfied", "confidence": 0.9, "supporting_snippets": []}
    state.evidence_map["Python"] = {"status": "missing", "confidence": 0.0, "supporting_snippets": []}

    updated = InterviewOrchestratorAgent.run(state)
    # The next missing requirement in policy is Python
    assert updated.target_requirement == "Python"
    assert updated.next_action == "switch_topic"
    assert updated.interview_phase == "SKILLS"

def test_orchestrator_max_turns_forces_wrap_up():
    """
    5. Reaching max_turns forces wrap-up.
    """
    profile = {
        "candidate_name": "Jane",
        "email": "jane@test.com"
    }
    state = InterviewState(
        messages=[],
        question_history=["Q"] * 12,
        answer_history=["A"] * 12,
        current_profile_data=profile,
        missing_requirements=["Motivation & Commitment"],
        interview_phase="BACKGROUND",
        next_action="switch_topic",
        target_requirement="Motivation & Commitment",
        scores=[{"overall_score": 4.0}] * 12,
        turn_count=12,
        max_turns=12
    )
    
    updated = InterviewOrchestratorAgent.run(state)
    assert updated.next_action == "wrap_up"
    assert updated.target_requirement is None
    assert updated.interview_phase == "WRAP_UP"
