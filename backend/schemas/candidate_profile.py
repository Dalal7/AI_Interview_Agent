from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict, Any, Optional

class CandidateProfileBase(BaseModel):
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    education: Optional[Dict[str, Any]] = Field(default_factory=dict)
    background: Optional[Dict[str, Any]] = Field(default_factory=dict)
    skills: Optional[List[str]] = Field(default_factory=list)
    projects: Optional[List[str]] = Field(default_factory=list)
    strengths: Optional[List[str]] = Field(default_factory=list)
    weaknesses: Optional[List[str]] = Field(default_factory=list)
    overall_score: float = 0.0
    recommendation: str = "WAITLIST"
    final_evaluation: Optional[str] = None

class CandidateProfileCreate(BaseModel):
    id: str
    candidate_name: str
    email: str

class CandidateProfileResponse(CandidateProfileBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
