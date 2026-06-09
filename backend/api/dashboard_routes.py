import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.repository import InterviewRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

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
            "created_at": p.created_at,
            "skills": json.loads(p.skills) if p.skills else []
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
        },
        "logs": formatted_logs
    }
