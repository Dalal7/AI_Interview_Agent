import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class CandidateProfile(Base):
    """
    Stores the candidate profile information, aggregated skills, strengths,
    weaknesses, final assessment, and recruiter decision recommendation.
    """
    __tablename__ = "candidate_profiles"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
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
    email_sent = Column(Boolean, default=False)
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


class LiveInterviewSession(Base):
    """
    Tracks a LiveKit-backed voice interview session for a candidate.
    Assessment state stays in InterviewStateModel and CandidateProfile.
    """
    __tablename__ = "live_interview_sessions"

    id = Column(String(36), primary_key=True)
    candidate_id = Column(String(36), ForeignKey("candidate_profiles.id"), nullable=False)
    room_name = Column(String(255), unique=True, nullable=False)
    participant_identity = Column(String(255), nullable=False)
    voice = Column(String(80), default="Puck")
    conversation_mode = Column(String(50), default="realtime")
    status = Column(String(50), default="preparing")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<LiveInterviewSession(room={self.room_name}, candidate_id={self.candidate_id})>"


class InterviewBlueprintModel(Base):
    """
    Stores the active interview blueprint serialized as JSON string.
    """
    __tablename__ = "interview_blueprints"

    id = Column(String(50), primary_key=True, default="active")
    blueprint_data = Column(Text, nullable=False)  # Serialized blueprint JSON string
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<InterviewBlueprintModel(id={self.id}, updated_at={self.updated_at})>"


class User(Base):
    """
    Stores authenticated users (recruiter admins and candidates).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "admin" or "candidate"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<User(username={self.username}, role={self.role})>"
