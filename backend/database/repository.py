import datetime
import json
from sqlalchemy.orm import Session
from backend.database.models import CandidateProfile, InterviewLog, InterviewStateModel, LiveInterviewSession, InterviewBlueprintModel

class InterviewRepository:
    """
    Handles all CRUD database operations for Candidate Profiles,
    Interview Logs (Transcripts), and active Interview States.
    """

    @staticmethod
    def get_candidate_profile(db: Session, candidate_id: str) -> CandidateProfile | None:
        return db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()

    @staticmethod
    def get_all_completed_profiles(db: Session) -> list[CandidateProfile]:
        # Return candidate profiles whose interview is completed (has final report and evaluation)
        return db.query(CandidateProfile).filter(CandidateProfile.final_evaluation != None).order_by(CandidateProfile.created_at.desc()).all()

    @staticmethod
    def create_candidate_profile(db: Session, candidate_id: str, name: str = None, email: str = None, user_id: int = None) -> CandidateProfile:
        db_profile = CandidateProfile(
            id=candidate_id,
            user_id=user_id,
            candidate_name=name or "Anonymous Candidate",
            email=email or "",
            education="{}",
            background="{}",
            skills="[]",
            projects="[]",
            strengths="[]",
            weaknesses="[]",
            overall_score=0.0,
            recommendation="WAITLIST",
            final_evaluation=None,
            email_sent=False
        )
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    @staticmethod
    def save_candidate_profile(db: Session, candidate_id: str, profile_data: dict) -> CandidateProfile:
        db_profile = InterviewRepository.get_candidate_profile(db, candidate_id)
        if not db_profile:
            db_profile = InterviewRepository.create_candidate_profile(db, candidate_id)

        # Update fields dynamically
        if "candidate_name" in profile_data:
            db_profile.candidate_name = profile_data["candidate_name"]
        if "email" in profile_data:
            db_profile.email = profile_data["email"]
        if "education" in profile_data:
            db_profile.education = json.dumps(profile_data["education"]) if isinstance(profile_data["education"], (dict, list)) else profile_data["education"]
        if "background" in profile_data:
            db_profile.background = json.dumps(profile_data["background"]) if isinstance(profile_data["background"], (dict, list)) else profile_data["background"]
        if "skills" in profile_data:
            db_profile.skills = json.dumps(profile_data["skills"]) if isinstance(profile_data["skills"], list) else profile_data["skills"]
        if "projects" in profile_data:
            db_profile.projects = json.dumps(profile_data["projects"]) if isinstance(profile_data["projects"], list) else profile_data["projects"]
        if "strengths" in profile_data:
            db_profile.strengths = json.dumps(profile_data["strengths"]) if isinstance(profile_data["strengths"], list) else profile_data["strengths"]
        if "weaknesses" in profile_data:
            db_profile.weaknesses = json.dumps(profile_data["weaknesses"]) if isinstance(profile_data["weaknesses"], list) else profile_data["weaknesses"]
        if "overall_score" in profile_data:
            db_profile.overall_score = float(profile_data["overall_score"])
        if "recommendation" in profile_data:
            db_profile.recommendation = profile_data["recommendation"]
        if "final_evaluation" in profile_data:
            db_profile.final_evaluation = profile_data["final_evaluation"]
        if "email_sent" in profile_data:
            db_profile.email_sent = bool(profile_data["email_sent"])

        db.commit()
        db.refresh(db_profile)
        return db_profile

    @staticmethod
    def log_interview_interaction(db: Session, candidate_id: str, question: str, answer: str, scores: dict) -> InterviewLog:
        db_log = InterviewLog(
            candidate_id=candidate_id,
            question=question,
            answer=answer,
            question_score=scores.get("overall_score", 0.0),
            technical_score=scores.get("technical_accuracy", 0.0),
            communication_score=scores.get("clarity", 0.0),
            relevance_score=scores.get("relevance", 0.0)
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_interview_logs(db: Session, candidate_id: str) -> list[InterviewLog]:
        return db.query(InterviewLog).filter(InterviewLog.candidate_id == candidate_id).order_by(InterviewLog.created_at.asc()).all()

    @staticmethod
    def save_interview_state(db: Session, candidate_id: str, state_data: dict) -> InterviewStateModel:
        db_state = db.query(InterviewStateModel).filter(InterviewStateModel.candidate_id == candidate_id).first()
        serialized_state = json.dumps(state_data)

        if db_state:
            db_state.state_data = serialized_state
        else:
            db_state = InterviewStateModel(candidate_id=candidate_id, state_data=serialized_state)
            db.add(db_state)

        db.commit()
        db.refresh(db_state)
        return db_state

    @staticmethod
    def get_interview_state(db: Session, candidate_id: str) -> dict | None:
        db_state = db.query(InterviewStateModel).filter(InterviewStateModel.candidate_id == candidate_id).first()
        if db_state:
            return json.loads(db_state.state_data)
        return None

    @staticmethod
    def create_live_session(
        db: Session,
        session_id: str,
        candidate_id: str,
        room_name: str,
        participant_identity: str,
        voice: str = "Puck",
        conversation_mode: str = "realtime",
    ) -> LiveInterviewSession:
        db_session = LiveInterviewSession(
            id=session_id,
            candidate_id=candidate_id,
            room_name=room_name,
            participant_identity=participant_identity,
            voice=voice,
            conversation_mode=conversation_mode,
            status="preparing",
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def get_live_session_by_room(db: Session, room_name: str) -> LiveInterviewSession | None:
        return db.query(LiveInterviewSession).filter(LiveInterviewSession.room_name == room_name).first()

    @staticmethod
    def update_live_session_status(db: Session, room_name: str, status: str) -> LiveInterviewSession | None:
        db_session = InterviewRepository.get_live_session_by_room(db=db, room_name=room_name)
        if not db_session:
            return None
        db_session.status = status
        if status == "ended":
            db_session.ended_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(db_session)
        return db_session

    @staticmethod
    def save_blueprint(db: Session, blueprint_data: dict) -> InterviewBlueprintModel:
        db_blueprint = db.query(InterviewBlueprintModel).filter(InterviewBlueprintModel.id == "active").first()
        serialized = json.dumps(blueprint_data)
        if db_blueprint:
            db_blueprint.blueprint_data = serialized
        else:
            db_blueprint = InterviewBlueprintModel(id="active", blueprint_data=serialized)
            db.add(db_blueprint)
        db.commit()
        db.refresh(db_blueprint)
        return db_blueprint

    @staticmethod
    def get_blueprint(db: Session) -> dict | None:
        db_blueprint = db.query(InterviewBlueprintModel).filter(InterviewBlueprintModel.id == "active").first()
        if db_blueprint:
            try:
                return json.loads(db_blueprint.blueprint_data)
            except Exception:
                return None
        return None

    @staticmethod
    def delete_blueprint(db: Session) -> bool:
        db_blueprint = db.query(InterviewBlueprintModel).filter(InterviewBlueprintModel.id == "active").first()
        if db_blueprint:
            db.delete(db_blueprint)
            db.commit()
            return True
        return False
