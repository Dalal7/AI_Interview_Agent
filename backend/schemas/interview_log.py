from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class InterviewLogBase(BaseModel):
    question: str
    answer: Optional[str] = None
    question_score: float = 0.0
    technical_score: float = 0.0
    communication_score: float = 0.0
    relevance_score: float = 0.0

class InterviewLogCreate(InterviewLogBase):
    candidate_id: str

class InterviewLogResponse(InterviewLogBase):
    id: int
    candidate_id: str
    created_at: datetime

    class Config:
        from_attributes = True
