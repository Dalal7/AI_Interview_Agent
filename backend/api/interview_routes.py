import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.repository import InterviewRepository
from backend.schemas.interview_state import InterviewState
from backend.graph.interview_graph import interview_graph
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/interview", tags=["Interview"])

class StartRequest(BaseModel):
    name: Optional[str] = Field(None, example="John Doe")
    email: Optional[str] = Field(None, example="john.doe@example.com")

class StartResponse(BaseModel):
    candidate_id: str
    question: str

class MessageRequest(BaseModel):
    candidate_id: str
    message: str

class MessageResponse(BaseModel):
    response: str
    profile_completion_percentage: int
    interview_phase: str
    interview_status: str

def calculate_completion(profile_data: dict) -> int:
    """
    Computes profile completion percentage.
    Completeness is based on: Background, Skills, Projects, and Education.
    """
    completion = 0
    
    # 1. Background
    bg = profile_data.get("background")
    if bg and bg != "{}" and bg != "{}":
        completion += 25
        
    # 2. Skills
    skills = profile_data.get("skills", [])
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = [skills] if skills else []
    if skills and len(skills) > 0:
        completion += 25
        
    # 3. Projects
    projects = profile_data.get("projects", [])
    if isinstance(projects, str):
        try:
            projects = json.loads(projects)
        except Exception:
            projects = [projects] if projects else []
    if projects and len(projects) > 0:
        completion += 25
        
    # 4. Education
    edu = profile_data.get("education")
    if edu and edu != "{}" and edu != "{}":
        completion += 25
        
    return completion

@router.post("/start", response_model=StartResponse)
def start_interview(payload: StartRequest, db: Session = Depends(get_db)):
    """
    Starts a new adaptive interview session. Generates candidate ID,
    seeds profile details, initializes LangGraph, and delivers the first question.
    """
    candidate_id = str(uuid.uuid4())
    
    # 1. Initialize candidate profile in DB
    InterviewRepository.create_candidate_profile(
        db=db,
        candidate_id=candidate_id,
        name=payload.name,
        email=payload.email
    )
    
    # 2. Initialize LangGraph State
    initial_profile = {
        "candidate_name": payload.name or "Anonymous Candidate",
        "email": payload.email or "",
        "education": "",
        "background": "",
        "skills": [],
        "projects": []
    }
    
    initial_state = InterviewState(
        messages=[{"role": "assistant", "content": "Initializing interview..."}],
        current_profile_data=initial_profile,
        missing_requirements=["Core Coding Knowledge", "Time Commitment", "Web Basics", "Database Fundamentals", "Problem Solving Mindset"],
        interview_phase="INTRODUCTION",
        candidate_id=candidate_id,
        question_history=[],
        answer_history=[],
        scores=[],
        strengths=[],
        weaknesses=[],
        detected_skills=[],
        interview_status="active"
    )

    # 3. Execute Graph Turn to generate the first question
    config = {"configurable": {"db": db, "thread_id": candidate_id}}
    try:
        output_state_dict = interview_graph.invoke(initial_state.model_dump(), config=config)
        # Parse output state
        output_state = InterviewState(**output_state_dict)
    except Exception as e:
        print(f"Error executing LangGraph startup: {e}")
        # Build manual startup question
        output_state = initial_state
        first_q = "Welcome! Thank you for applying to our competitive bootcamp. To start our conversation, could you please introduce yourself and share what motivated you to pursue software engineering?"
        output_state.question_history.append(first_q)
        output_state.messages.append({"role": "assistant", "content": first_q})

    # 4. Save state to DB
    InterviewRepository.save_interview_state(
        db=db,
        candidate_id=candidate_id,
        state_data=output_state.model_dump()
    )

    return StartResponse(
        candidate_id=candidate_id,
        question=output_state.question_history[-1] if output_state.question_history else "Welcome! Please type something to start."
    )

@router.post("/message", response_model=MessageResponse)
def continue_interview(payload: MessageRequest, db: Session = Depends(get_db)):
    """
    Processes the candidate's response. Resumes LangGraph execution, evaluates the answer,
    extracts details, determines next path, and returns the next question or wrap-up.
    """
    # 1. Load existing state
    state_data = InterviewRepository.get_interview_state(db=db, candidate_id=payload.candidate_id)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found. Please start the interview first."
        )

    state = InterviewState(**state_data)

    if state.interview_status == "completed":
        # Calculate completion percentage from stored profile
        profile = InterviewRepository.get_candidate_profile(db=db, candidate_id=payload.candidate_id)
        profile_dict = {
            "background": profile.background,
            "skills": profile.skills,
            "projects": profile.projects,
            "education": profile.education
        }
        comp = calculate_completion(profile_dict)
        return MessageResponse(
            response="Thank you. The interview is already completed.",
            profile_completion_percentage=comp,
            interview_phase=state.interview_phase,
            interview_status=state.interview_status
        )

    # 2. Append new user message
    state.answer_history.append(payload.message)
    state.messages.append({"role": "user", "content": payload.message})

    # 3. Execute Graph Turn
    config = {"configurable": {"db": db, "thread_id": payload.candidate_id}}
    try:
        output_state_dict = interview_graph.invoke(state.model_dump(), config=config)
        output_state = InterviewState(**output_state_dict)
    except Exception as e:
        print(f"Error executing LangGraph message step: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview graph error: {str(e)}"
        )

    # 4. Save state to DB
    InterviewRepository.save_interview_state(
        db=db,
        candidate_id=payload.candidate_id,
        state_data=output_state.model_dump()
    )

    # 5. Fetch profile details for completion metrics
    profile_db = InterviewRepository.get_candidate_profile(db=db, candidate_id=payload.candidate_id)
    
    # Calculate completion percentage
    profile_dict = {
        "background": profile_db.background if profile_db else "",
        "skills": profile_db.skills if profile_db else "",
        "projects": profile_db.projects if profile_db else "",
        "education": profile_db.education if profile_db else ""
    }
    completion_percentage = calculate_completion(profile_dict)

    # Resolve last response (next question or wrap-up completion summary)
    if output_state.interview_status == "completed" and profile_db and profile_db.final_evaluation:
        response_content = "The interview is now complete! Thank you for your time. Your admissions assessment dashboard has been updated."
    else:
        response_content = output_state.question_history[-1] if output_state.question_history else "Please continue..."

    return MessageResponse(
        response=response_content,
        profile_completion_percentage=completion_percentage,
        interview_phase=output_state.interview_phase,
        interview_status=output_state.interview_status
    )

@router.get("/profile/{candidate_id}")
def get_interview_profile(candidate_id: str, db: Session = Depends(get_db)):
    """
    Returns the Candidate Profile details parsed during the screening.
    """
    profile = InterviewRepository.get_candidate_profile(db=db, candidate_id=candidate_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )
    
    # Format DB entity fields back into JSON objects
    return {
        "id": profile.id,
        "candidate_name": profile.candidate_name,
        "email": profile.email,
        "education": json.loads(profile.education) if profile.education else {},
        "background": json.loads(profile.background) if profile.background else {},
        "skills": json.loads(profile.skills) if profile.skills else [],
        "projects": json.loads(profile.projects) if profile.projects else [],
        "strengths": json.loads(profile.strengths) if profile.strengths else [],
        "weaknesses": json.loads(profile.weaknesses) if profile.weaknesses else [],
        "overall_score": profile.overall_score,
        "recommendation": profile.recommendation,
        "final_evaluation": profile.final_evaluation,
        "created_at": profile.created_at
    }
