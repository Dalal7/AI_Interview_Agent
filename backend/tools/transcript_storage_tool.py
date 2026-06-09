from sqlalchemy.orm import Session
from backend.database.repository import InterviewRepository

class TranscriptStorageTool:
    """
    Tool called by the Decision Support Agent or LangGraph nodes
    to save dialogue responses and per-question scoring to the database.
    """

    @staticmethod
    def log_interaction(db: Session, candidate_id: str, question: str, answer: str, scores: dict):
        """
        Logs an individual question-response turn along with technical, relevance,
        and clarity scores to the database.
        """
        return InterviewRepository.log_interview_interaction(db, candidate_id, question, answer, scores)
