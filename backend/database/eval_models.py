import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from backend.database.models import Base

class SystemEvaluationLog(Base):
    """
    Stores system-level quality metrics (cost, latency, accuracy, stability, security)
    for every automated agent interaction.
    """
    __tablename__ = "system_evaluation_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    interview_id = Column(String(36), nullable=True)
    candidate_id = Column(String(36), nullable=True)
    question_id = Column(String(50), nullable=True)
    agent = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)

    # Cost metrics
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    session_cost = Column(Float, default=0.0)

    # Latency metrics (in milliseconds)
    retrieval_ms = Column(Integer, default=0)
    llm_ms = Column(Integer, default=0)
    evaluation_ms = Column(Integer, default=0)
    total_ms = Column(Integer, default=0)

    # Accuracy metrics
    accuracy_rubric_retrieval = Column(Boolean, default=True)
    accuracy_correct_bootcamp = Column(Boolean, default=True)
    accuracy_valid_json = Column(Boolean, default=True)
    accuracy_schema_valid = Column(Boolean, default=True)
    accuracy_score = Column(Float, default=1.0)

    # Stability metrics
    stability_score_variance = Column(Float, default=0.0)
    stability_retrieval_overlap = Column(Float, default=1.0)
    stability_response_similarity = Column(Float, default=1.0)
    stability_score = Column(Float, default=1.0)

    # Security metrics
    security_prompt_injection_detected = Column(Boolean, default=False)
    security_jailbreak_detected = Column(Boolean, default=False)
    security_unsafe_content_detected = Column(Boolean, default=False)
    security_score = Column(Float, default=1.0)

    def __repr__(self):
        return f"<SystemEvaluationLog(id={self.id}, agent={self.agent}, cost={self.estimated_cost}, latency={self.total_ms}ms)>"
