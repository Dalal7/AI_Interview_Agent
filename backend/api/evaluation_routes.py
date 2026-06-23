import uuid
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.database.session import get_db
from backend.database.eval_repository import SystemEvaluationRepository
from backend.database.eval_models import SystemEvaluationLog
from backend.database.repository import InterviewRepository
from backend.schemas.interview_state import InterviewState
from backend.graph.interview_graph import interview_graph
from backend.tools.rag_retrieval_tool import rag_retriever
from backend.services.system_evaluation_service import compute_cosine_similarity

router = APIRouter(prefix="/evaluation", tags=["System Evaluation"])

class StabilityTestRequest(BaseModel):
    candidate_id: str = Field(..., example="some-candidate-uuid")
    message: str = Field(..., example="Explain how python handles memory management.")
    runs_count: int = Field(3, ge=3, le=10, description="Number of repeated runs (3 to 10)")

class StabilityTestResponse(BaseModel):
    score_variance: float
    retrieval_overlap: float
    response_similarity: float
    stability_score: float
    runs: List[Dict[str, Any]]

@router.get("/dashboard")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Returns aggregated system performance, cost, accuracy, and security metrics.
    """
    try:
        stats = SystemEvaluationRepository.get_dashboard_stats(db)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system metrics: {str(e)}"
        )

@router.get("/logs", response_model=List[Dict[str, Any]])
def get_evaluation_logs(limit: int = 50, db: Session = Depends(get_db)):
    """
    Returns the raw history of system evaluation steps.
    """
    try:
        logs = db.query(SystemEvaluationLog).order_by(SystemEvaluationLog.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "interview_id": log.interview_id,
                "candidate_id": log.candidate_id,
                "question_id": log.question_id,
                "agent": log.agent,
                "model": log.model,
                "cost": {
                    "prompt_tokens": log.prompt_tokens,
                    "completion_tokens": log.completion_tokens,
                    "total_tokens": log.total_tokens,
                    "estimated_cost": log.estimated_cost,
                    "session_cost": log.session_cost
                },
                "latency": {
                    "retrieval_ms": log.retrieval_ms,
                    "llm_ms": log.llm_ms,
                    "evaluation_ms": log.evaluation_ms,
                    "total_ms": log.total_ms
                },
                "accuracy": {
                    "rubric_retrieval": log.accuracy_rubric_retrieval,
                    "correct_bootcamp": log.accuracy_correct_bootcamp,
                    "valid_json": log.accuracy_valid_json,
                    "schema_valid": log.accuracy_schema_valid,
                    "accuracy_score": log.accuracy_score
                },
                "stability": {
                    "score_variance": log.stability_score_variance,
                    "retrieval_overlap": log.stability_retrieval_overlap,
                    "response_similarity": log.stability_response_similarity,
                    "stability_score": log.stability_score
                },
                "security": {
                    "prompt_injection_detected": log.security_prompt_injection_detected,
                    "jailbreak_detected": log.security_jailbreak_detected,
                    "unsafe_content_detected": log.security_unsafe_content_detected,
                    "security_score": log.security_score
                }
            }
            for log in logs
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query system logs: {str(e)}"
        )

@router.post("/run-stability-test", response_model=StabilityTestResponse)
def run_stability_test(payload: StabilityTestRequest, db: Session = Depends(get_db)):
    """
    Executes an isolated graph turn multiple times (3 to 10 runs) for the same input state,
    calculates response cosine similarity, retrieval Jaccard overlap, and score variance.
    """
    # 1. Load active candidate state
    state_data = InterviewRepository.get_interview_state(db=db, candidate_id=payload.candidate_id)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate interview state not found. Start the session first."
        )

    base_state = InterviewState(**state_data)
    if base_state.interview_status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot run stability tests on a completed interview session."
        )

    # Prepare inputs
    base_state.answer_history.append(payload.message)
    base_state.messages.append({"role": "user", "content": payload.message})

    # Lists to collect outputs across runs
    generated_questions = []
    evaluation_scores = []
    retrieved_rubric_sets = []
    run_records = []

    # Mock db.commit during stability runs to prevent nested transaction closure
    original_commit = db.commit
    db.commit = lambda: None
    try:
        for run_idx in range(payload.runs_count):
            # Establish nested transaction so DB writes inside nodes are automatically discarded
            nested = db.begin_nested()
            try:
                # Deep copy state dict
                state_dict = base_state.model_dump()
                
                # Run graph with unique temporary thread ID so it does not conflict with active candidate graph thread
                config = {"configurable": {"db": db, "thread_id": f"stability-run-{uuid.uuid4()}"}}
                
                output_state_dict = interview_graph.invoke(state_dict, config=config)
                output_state = InterviewState(**output_state_dict)

                # Extract generated question and score
                next_q = output_state.question_history[-1] if output_state.question_history else ""
                score = output_state.scores[-1].get("overall_score", 3.0) if output_state.scores else 3.0
                
                # Retrieve RAG rubrics for Jaccard overlap calculation
                last_question = base_state.question_history[-1] if base_state.question_history else ""
                rubrics = rag_retriever.retrieve_rubrics(query=last_question, top_k=2)
                rubric_categories = {r["category"] for r in rubrics}

                generated_questions.append(next_q)
                evaluation_scores.append(score)
                retrieved_rubric_sets.append(rubric_categories)

                run_records.append({
                    "run": run_idx + 1,
                    "question": next_q,
                    "score": score,
                    "rubrics": list(rubric_categories)
                })
            finally:
                nested.rollback()
    finally:
        db.commit = original_commit

    # Calculate Jaccard retrieval overlap (pairwise comparisons)
    jaccard_scores = []
    for i in range(len(retrieved_rubric_sets)):
        for j in range(i + 1, len(retrieved_rubric_sets)):
            set_a = retrieved_rubric_sets[i]
            set_b = retrieved_rubric_sets[j]
            if not set_a and not set_b:
                jaccard_scores.append(1.0)
            elif not set_a or not set_b:
                jaccard_scores.append(0.0)
            else:
                intersection = len(set_a.intersection(set_b))
                union = len(set_a.union(set_b))
                jaccard_scores.append(float(intersection / union))
    avg_jaccard = float(np.mean(jaccard_scores)) if jaccard_scores else 1.0

    # Calculate response cosine similarities (pairwise comparisons)
    similarity_scores = []
    for i in range(len(generated_questions)):
        for j in range(i + 1, len(generated_questions)):
            sim = compute_cosine_similarity(generated_questions[i], generated_questions[j])
            similarity_scores.append(sim)
    avg_similarity = float(np.mean(similarity_scores)) if similarity_scores else 1.0

    # Calculate evaluation score variance
    score_variance = float(np.var(evaluation_scores)) if len(evaluation_scores) > 1 else 0.0

    # Compute overall stability score
    # High score variance reduces stability; high similarity & Jaccard increases it
    variance_penalty = min(math_penalty(score_variance), 1.0)
    stability_score = float((1.0 - variance_penalty) * 0.4 + avg_jaccard * 0.3 + avg_similarity * 0.3)

    return StabilityTestResponse(
        score_variance=round(score_variance, 4),
        retrieval_overlap=round(avg_jaccard, 4),
        response_similarity=round(avg_similarity, 4),
        stability_score=round(stability_score, 4),
        runs=run_records
    )

def math_penalty(var: float) -> float:
    # simple standard deviation based penalty
    import math
    return math.sqrt(var) * 0.5
