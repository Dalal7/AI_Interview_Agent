import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class CandidateProfile(Base):
    """
    Stores the candidate profile information, aggregated skills, strengths,
    weaknesses, final assessment, and recruiter decision recommendation.
    """
    __tablename__ = "candidate_profiles"

    id = Column(String(36), primary_key=True)
    candidate_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    education = Column(Text, nullable=True)  # JSON-serialized string
    background = Column(Text, nullable=True)  # JSON-serialized string
    skills = Column(Text, nullable=True)  # JSON-serialized list of skills
    projects = Column(Text, nullable=True)  # JSON-serialized string
    strengths = Column(Text, nullable=True)  # JSON-serialized list of strengths
    weaknesses = Column(Text, nullable=True)  # JSON-serialized list of weaknesses
    overall_score = Column(Float, default=0.0)
    recommendation = Column(String(50), default="WAITLIST")  # ACCEPT, ACCEPT_WITH_CONDITIONS, WAITLIST, REJECT
    final_evaluation = Column(Text, nullable=True)  # Final Admissions Report text
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    logs = relationship("InterviewLog", back_populates="candidate", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CandidateProfile(id={self.id}, name={self.candidate_name}, recommendation={self.recommendation})>"


class InterviewLog(Base):
    """
    Stores question-by-question dialogue logs along with per-question scores.
    """
    __tablename__ = "interview_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String(36), ForeignKey("candidate_profiles.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    question_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    communication_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    candidate = relationship("CandidateProfile", back_populates="logs")

    def __repr__(self):
        return f"<InterviewLog(candidate_id={self.candidate_id}, score={self.question_score})>"


class InterviewStateModel(Base):
    """
    Stores the serialized LangGraph state to allow stateful session recovery.
    """
    __tablename__ = "interview_states"

    candidate_id = Column(String(36), primary_key=True)
    state_data = Column(Text, nullable=False)  # JSON-serialized LangGraph state
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<InterviewStateModel(candidate_id={self.candidate_id})>"
