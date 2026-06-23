import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.repository import InterviewRepository
from backend.schemas.interview_state import InterviewState
from backend.graph.interview_graph import interview_graph
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

router = APIRouter(prefix="/interview", tags=["Interview"])

class StartRequest(BaseModel):
    name: Optional[str] = Field(None, example="John Doe")
    email: Optional[str] = Field(None, example="john.doe@example.com")
    orchestration_strategy: Optional[str] = Field("config", example="config")
    username: Optional[str] = Field(None, example="Dalal")

class StartResponse(BaseModel):
    candidate_id: str
    question: str
    debug_state: Optional[Dict[str, Any]] = None

class MessageRequest(BaseModel):
    candidate_id: str
    message: str

class MessageResponse(BaseModel):
    response: str
    profile_completion_percentage: int
    interview_phase: str
    interview_status: str
    debug_state: Optional[Dict[str, Any]] = None

def calculate_completion(evidence_map: dict) -> int:
    """
    Computes profile completion percentage.
    Completeness is based on the 13 categories from the evidence map.
    """
    if not evidence_map:
        return 0
    satisfied_count = sum(
        1 for item in evidence_map.values() 
        if item.get("status") in ["satisfied", "weak"]
    )
    total_reqs = len(evidence_map)
    if total_reqs == 0:
        return 0
    return int((satisfied_count / total_reqs) * 100)

def build_debug_state(state: InterviewState) -> Dict[str, Any]:
    return {
        "evidence_map": state.evidence_map,
        "next_action": state.next_action,
        "target_requirement": state.target_requirement,
        "scores": state.scores,
        "strengths": state.strengths,
        "weaknesses": state.weaknesses,
        "turn_count": state.turn_count,
        "max_turns": state.max_turns,
        "orchestration_strategy": state.orchestration_strategy,
        "detected_skills": state.detected_skills,
        "question_history": state.question_history,
        "answer_history": state.answer_history,
    }

def process_candidate_message(candidate_id: str, message: str, db: Session, agent: str = "EvaluationAgent") -> MessageResponse:
    """
    Shared graph turn runner used by text chat and finalized voice transcripts.
    """
    from backend.services.system_evaluation_service import SystemEvaluationService
    SystemEvaluationService.init_transaction(candidate_id=candidate_id, agent=agent, interview_id=candidate_id)
    try:
        SystemEvaluationService.perform_security_check(message)
        
        # Check context for security violations
        from backend.services.system_evaluation_service import _metrics_context
        ctx = _metrics_context.get()
        if ctx and (ctx.get("security_prompt_injection_detected") or 
                    ctx.get("security_jailbreak_detected") or 
                    ctx.get("security_unsafe_content_detected")):
            state_data = InterviewRepository.get_interview_state(db=db, candidate_id=candidate_id)
            if not state_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found. Please start the interview first."
                )
            state = InterviewState(**state_data)
            
            return MessageResponse(
                response="Security Warning: Our automated system has flagged a security policy violation in your message. Please proceed with the screening task and answer the technical questions without attempting prompt injections or jailbreaks.",
                profile_completion_percentage=calculate_completion(state.evidence_map),
                interview_phase=state.interview_phase,
                interview_status=state.interview_status,
                debug_state=build_debug_state(state),
            )

        state_data = InterviewRepository.get_interview_state(db=db, candidate_id=candidate_id)
        if not state_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found. Please start the interview first."
            )

        state = InterviewState(**state_data)

        if state.interview_status == "completed":
            return MessageResponse(
                response="Thank you. The interview is already completed.",
                profile_completion_percentage=calculate_completion(state.evidence_map),
                interview_phase=state.interview_phase,
                interview_status=state.interview_status,
                debug_state=build_debug_state(state),
            )

        state.answer_history.append(message)
        state.messages.append({"role": "user", "content": message})

        config = {"configurable": {"db": db, "thread_id": candidate_id}}
        try:
            output_state_dict = interview_graph.invoke(state.model_dump(), config=config)
            output_state = InterviewState(**output_state_dict)
        except Exception as e:
            print(f"Error executing LangGraph message step: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Interview graph error: {str(e)}"
            )

        InterviewRepository.save_interview_state(
            db=db,
            candidate_id=candidate_id,
            state_data=output_state.model_dump()
        )

        profile_db = InterviewRepository.get_candidate_profile(db=db, candidate_id=candidate_id)
        completion_percentage = calculate_completion(output_state.evidence_map)

        if output_state.interview_status == "completed" and profile_db and profile_db.final_evaluation:
            response_content = "The interview is now complete! Thank you for your time. We will reach out to you shortly"
        else:
            response_content = output_state.question_history[-1] if output_state.question_history else "Please continue..."

        return MessageResponse(
            response=response_content,
            profile_completion_percentage=completion_percentage,
            interview_phase=output_state.interview_phase,
            interview_status=output_state.interview_status,
            debug_state=build_debug_state(output_state),
        )
    finally:
        SystemEvaluationService.finalize_transaction(db)

@router.post("/start", response_model=StartResponse)
def start_interview(payload: StartRequest, db: Session = Depends(get_db)):
    """
    Starts a new adaptive interview session. Generates candidate ID,
    seeds profile details, initializes LangGraph, and delivers the first question.
    """
    candidate_id = str(uuid.uuid4())
    
    from backend.services.system_evaluation_service import SystemEvaluationService
    SystemEvaluationService.init_transaction(candidate_id=candidate_id, agent="AdmissionsAgent", interview_id=candidate_id)
    try:
        # 1. Initialize candidate profile in DB
        from backend.database.models import User
        user_id = None
        if payload.username:
            u = db.query(User).filter(User.username == payload.username).first()
            if u:
                user_id = u.id

        InterviewRepository.create_candidate_profile(
            db=db,
            candidate_id=candidate_id,
            name=payload.name,
            email=payload.email,
            user_id=user_id
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
            missing_requirements=[
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
            ],
            interview_phase="INTRODUCTION",
            candidate_id=candidate_id,
            question_history=[],
            answer_history=[],
            scores=[],
            strengths=[],
            weaknesses=[],
            detected_skills=[],
            interview_status="active",
            evidence_map={},
            next_action="ask_first_question",
            target_requirement="Candidate Background",
            interview_summary="",
            turn_count=0,
            max_turns=12,
            orchestration_strategy=payload.orchestration_strategy or "config"
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
            candidate_name = payload.name or "Candidate"
            first_q = f"Welcome {candidate_name}! Thank you for applying to our competitive bootcamp. To start our conversation, could you please share a brief summary of your background and what brings you here today?"
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
            question=output_state.question_history[-1] if output_state.question_history else "Welcome! Please type something to start.",
            debug_state=build_debug_state(output_state)
        )
    finally:
        SystemEvaluationService.finalize_transaction(db)

@router.post("/message", response_model=MessageResponse)
def continue_interview(payload: MessageRequest, db: Session = Depends(get_db)):
    """
    Processes the candidate's response. Resumes LangGraph execution, evaluates the answer,
    extracts details, determines next path, and returns the next question or wrap-up.
    """
    return process_candidate_message(payload.candidate_id, payload.message, db)

def safe_json_loads(val: str | None, default_val: any) -> any:
    if not val:
        return default_val
    try:
        return json.loads(val)
    except Exception:
        return val

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
        "education": safe_json_loads(profile.education, {}),
        "background": safe_json_loads(profile.background, {}),
        "skills": safe_json_loads(profile.skills, []),
        "projects": safe_json_loads(profile.projects, []),
        "strengths": safe_json_loads(profile.strengths, []),
        "weaknesses": safe_json_loads(profile.weaknesses, []),
        "overall_score": profile.overall_score,
        "recommendation": profile.recommendation,
        "final_evaluation": profile.final_evaluation,
        "created_at": profile.created_at
    }

@router.get("/history/{username}")
def get_interview_history(username: str, db: Session = Depends(get_db)):
    """
    Retrieves previous interview profiles and results for a user.
    """
    from backend.database.models import User, CandidateProfile
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    
    profiles = db.query(CandidateProfile).filter(
        (CandidateProfile.user_id == user.id) | 
        (CandidateProfile.candidate_name == username)
    ).order_by(CandidateProfile.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "candidate_name": p.candidate_name,
            "email": p.email,
            "overall_score": p.overall_score,
            "recommendation": p.recommendation,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed": p.final_evaluation is not None
        }
        for p in profiles
    ]
