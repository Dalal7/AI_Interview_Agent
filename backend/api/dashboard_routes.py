import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database.session import get_db
from backend.database.repository import InterviewRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class UpdateStatusRequest(BaseModel):
    recommendation: str

def safe_json_loads(val: str | None, default_val: any) -> any:
    if not val:
        return default_val
    try:
        return json.loads(val)
    except Exception:
        return val

@router.get("/candidates")
def list_completed_candidates(db: Session = Depends(get_db)):
    """
    Returns a list of all candidates who have completed their interview
    and have a generated admissions assessment.
    """
    profiles = InterviewRepository.get_all_completed_profiles(db=db)
    
    results = []
    for p in profiles:
        results.append({
            "id": p.id,
            "candidate_name": p.candidate_name,
            "email": p.email,
            "overall_score": p.overall_score,
            "recommendation": p.recommendation,
            "email_sent": p.email_sent,
            "created_at": p.created_at,
            "skills": safe_json_loads(p.skills, [])
        })
    return results

@router.get("/candidate/{candidate_id}")
def get_candidate_evaluation(candidate_id: str, db: Session = Depends(get_db)):
    """
    Returns the full candidate assessment dossier including profile information,
    final recommendation letter, and question-by-question scoring transcripts.
    """
    profile = InterviewRepository.get_candidate_profile(db=db, candidate_id=candidate_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )

    logs = InterviewRepository.get_interview_logs(db=db, candidate_id=candidate_id)
    formatted_logs = []
    for log in logs:
        formatted_logs.append({
            "id": log.id,
            "question": log.question,
            "answer": log.answer,
            "question_score": log.question_score,
            "technical_score": log.technical_score,
            "communication_score": log.communication_score,
            "relevance_score": log.relevance_score,
            "created_at": log.created_at
        })

    return {
        "profile": {
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
            "email_sent": profile.email_sent,
            "final_evaluation": profile.final_evaluation,
            "created_at": profile.created_at
        },
        "logs": formatted_logs
    }

@router.post("/candidate/{candidate_id}/update-status")
def update_candidate_status(candidate_id: str, payload: UpdateStatusRequest, db: Session = Depends(get_db)):
    """
    Allows the admissions team to update a candidate's final recommendation status.
    """
    profile = InterviewRepository.get_candidate_profile(db=db, candidate_id=candidate_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found."
        )
    
    # Allowed statuses
    allowed = ["ACCEPT", "WAITLIST", "REJECT"]
    if payload.recommendation not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of {allowed}"
        )
        
    InterviewRepository.save_candidate_profile(db=db, candidate_id=candidate_id, profile_data={"recommendation": payload.recommendation})
    return {"status": "success", "recommendation": payload.recommendation}

@router.post("/candidate/{candidate_id}/send-email")
def send_results_email(candidate_id: str, db: Session = Depends(get_db)):
    """
    Triggers generating and sending/saving results email to the candidate.
    """
    from backend.agents.email_agent import EmailAgent
    success = EmailAgent.send_results_email(db=db, candidate_id=candidate_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send results email."
        )
    return {"status": "success", "message": "Email sent successfully"}

