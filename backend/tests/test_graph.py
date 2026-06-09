import os
import pytest
from sqlalchemy.orm import Session
from backend.schemas.interview_state import InterviewState
from backend.graph.interview_graph import interview_graph
from backend.database.session import SessionLocal, Base, engine

@pytest.fixture(scope="module")
def db():
    # Setup test database tables
    Base.metadata.create_all(bind=engine)
    db_session = SessionLocal()
    yield db_session
    # Teardown
    db_session.close()
    Base.metadata.drop_all(bind=engine)

def test_graph_initial_start(db):
    """
    Validates starting the interview graph from scratch:
    Ensures that Q1 is generated and phase is set to INTRODUCTION.
    """
    initial_profile = {
        "candidate_name": "Test Candidate",
        "email": "test@candidate.com",
        "education": "",
        "background": "",
        "skills": [],
        "projects": []
    }
    
    state = InterviewState(
        messages=[],
        current_profile_data=initial_profile,
        missing_requirements=["Time Commitment", "Core Coding Knowledge"],
        interview_phase="INTRODUCTION",
        candidate_id="test-candidate-123",
        question_history=[],
        answer_history=[],
        scores=[],
        strengths=[],
        weaknesses=[],
        detected_skills=[],
        interview_status="active"
    )

    config = {"configurable": {"db": db, "thread_id": "test-candidate-123"}}
    output = interview_graph.invoke(state.model_dump(), config=config)

    output_state = InterviewState(**output)
    
    # Assertions
    assert len(output_state.question_history) == 1
    assert output_state.interview_phase == "INTRODUCTION"
    assert output_state.interview_status == "active"
    assert len(output_state.messages) == 1
    assert output_state.messages[0]["role"] == "assistant"

def test_graph_message_transition(db):
    """
    Validates sending an answer and running evaluation, profile building,
    and decision support. Ensures phase increments.
    """
    profile = {
        "candidate_name": "Test Candidate",
        "email": "test@candidate.com",
        "education": "",
        "background": "",
        "skills": [],
        "projects": []
    }
    
    state = InterviewState(
        messages=[
            {"role": "assistant", "content": "Welcome! Please tell me your name and email."}
        ],
        current_profile_data=profile,
        missing_requirements=["Time Commitment", "Core Coding Knowledge"],
        interview_phase="INTRODUCTION",
        candidate_id="test-candidate-123",
        question_history=["Welcome! Please tell me your name and email."],
        answer_history=["My name is John and email is john@test.com"], # User answer
        scores=[],
        strengths=[],
        weaknesses=[],
        detected_skills=[],
        interview_status="active"
    )

    config = {"configurable": {"db": db, "thread_id": "test-candidate-123"}}
    output = interview_graph.invoke(state.model_dump(), config=config)
    output_state = InterviewState(**output)

    # Evaluation, Profile Builder and Decision Support should run
    assert len(output_state.scores) == 1
    # Check if profile data was extracted (regex fallback or Gemini)
    assert output_state.current_profile_data["candidate_name"] == "John"
    assert output_state.current_profile_data["email"] == "john@test.com"
    
    # It should have updated the phase to BACKGROUND
    assert output_state.interview_phase == "BACKGROUND"
    # It should have generated Q2 (for BACKGROUND phase)
    assert len(output_state.question_history) == 2
