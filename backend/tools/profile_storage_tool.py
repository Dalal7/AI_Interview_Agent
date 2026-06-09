from sqlalchemy.orm import Session
from backend.database.repository import InterviewRepository

class ProfileStorageTool:
    """
    Tool called by the Profile Builder Agent or LangGraph nodes
    to persist candidate information in the database.
    """

    @staticmethod
    def save_profile(db: Session, candidate_id: str, profile_data: dict):
        """
        Persists the current candidate profile fields (e.g. background, skills)
        to the database.
        """
        return InterviewRepository.save_candidate_profile(db, candidate_id, profile_data)
