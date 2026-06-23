from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class InterviewState(BaseModel):
    """
    Main state object passed through LangGraph nodes.
    Holds all intermediate conversation records, current profile extractions,
    and evaluation metrics.
    """
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    current_profile_data: Dict[str, Any] = Field(default_factory=dict)
    missing_requirements: List[str] = Field(default_factory=list)
    interview_phase: str = "INTRODUCTION"
    candidate_id: str = ""
    question_history: List[str] = Field(default_factory=list)
    answer_history: List[str] = Field(default_factory=list)
    scores: List[Dict[str, Any]] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    detected_skills: List[str] = Field(default_factory=list)
    interview_status: str = "active"
    
    # Orchestrator-facing fields
    evidence_map: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    next_action: str = "ask_first_question"
    target_requirement: Optional[str] = "Candidate Background"
    interview_summary: str = ""
    turn_count: int = 0
    max_turns: int = 12
    orchestration_strategy: str = "prompt"

