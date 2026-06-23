import os
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.api.interview_routes import (
    MessageResponse,
    StartRequest,
    build_debug_state,
    calculate_completion,
    process_candidate_message,
    start_interview,
)
from backend.database.repository import InterviewRepository
from backend.database.session import get_db
from backend.schemas.interview_state import InterviewState

router = APIRouter(prefix="/live", tags=["Live Voice"])


class LiveSessionCreateRequest(BaseModel):
    name: Optional[str] = Field(None, example="Dalal")
    email: Optional[str] = Field(None, example="dalal@example.com")
    username: Optional[str] = Field(None, example="Dalal")
    voice: str = Field("Puck", example="Puck")
    conversation_mode: str = Field("realtime", example="realtime")
    orchestration_strategy: str = Field("prompt", example="prompt")


class LiveSessionCreateResponse(BaseModel):
    session_id: str
    candidate_id: str
    room_name: str
    participant_identity: str
    first_question: str
    livekit_url: Optional[str] = None
    debug_state: Optional[Dict[str, Any]] = None


class LiveKitTokenRequest(BaseModel):
    room_name: str
    participant_identity: str
    participant_name: Optional[str] = None


class LiveKitTokenResponse(BaseModel):
    token: str
    livekit_url: str
    room_name: str
    participant_identity: str


class VoiceTurnRequest(BaseModel):
    candidate_id: str
    transcript: str
    room_name: Optional[str] = None
    is_final: bool = True
    source: str = "voice"


class LiveSessionEndRequest(BaseModel):
    room_name: str


def _livekit_url() -> str:
    return os.getenv("LIVEKIT_URL", "")


def _build_livekit_token(room_name: str, identity: str, name: Optional[str]) -> str:
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if not api_key or not api_secret or not _livekit_url():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
        )

    try:
        from livekit import api
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="LiveKit token support is not installed. Install backend requirements first.",
        ) from exc

    return (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name(name or identity)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
        .to_jwt()
    )


@router.post("/session", response_model=LiveSessionCreateResponse)
def create_live_session(payload: LiveSessionCreateRequest, db: Session = Depends(get_db)):
    """
    Creates a normal interview session and wraps it in LiveKit room metadata.
    """
    start_response = start_interview(
        StartRequest(
            name=payload.name,
            email=payload.email,
            username=payload.username,
            orchestration_strategy=payload.orchestration_strategy,
        ),
        db,
    )

    session_id = str(uuid.uuid4())
    room_name = f"interview_{start_response.candidate_id}"
    participant_identity = f"candidate_{start_response.candidate_id}"

    InterviewRepository.create_live_session(
        db=db,
        session_id=session_id,
        candidate_id=start_response.candidate_id,
        room_name=room_name,
        participant_identity=participant_identity,
        voice=payload.voice,
        conversation_mode=payload.conversation_mode,
    )

    return LiveSessionCreateResponse(
        session_id=session_id,
        candidate_id=start_response.candidate_id,
        room_name=room_name,
        participant_identity=participant_identity,
        first_question=start_response.question,
        livekit_url=_livekit_url() or None,
        debug_state=start_response.debug_state,
    )


@router.get("/session/{room_name}")
def get_live_session(room_name: str, db: Session = Depends(get_db)):
    db_session = InterviewRepository.get_live_session_by_room(db=db, room_name=room_name)
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live session not found.",
        )

    state_data = InterviewRepository.get_interview_state(db=db, candidate_id=db_session.candidate_id)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview state not found.",
        )
    state = InterviewState(**state_data)

    return {
        "session_id": db_session.id,
        "candidate_id": db_session.candidate_id,
        "room_name": db_session.room_name,
        "participant_identity": db_session.participant_identity,
        "voice": db_session.voice,
        "conversation_mode": db_session.conversation_mode,
        "status": db_session.status,
        "current_question": state.question_history[-1] if state.question_history else "",
        "completion": calculate_completion(state.evidence_map),
        "interview_phase": state.interview_phase,
        "interview_status": state.interview_status,
        "debug_state": build_debug_state(state),
    }


@router.post("/token", response_model=LiveKitTokenResponse)
def create_livekit_token(payload: LiveKitTokenRequest):
    token = _build_livekit_token(
        room_name=payload.room_name,
        identity=payload.participant_identity,
        name=payload.participant_name,
    )
    return LiveKitTokenResponse(
        token=token,
        livekit_url=_livekit_url(),
        room_name=payload.room_name,
        participant_identity=payload.participant_identity,
    )


@router.post("/voice-turn", response_model=MessageResponse)
def submit_voice_turn(payload: VoiceTurnRequest, db: Session = Depends(get_db)):
    """
    Routes finalized voice transcript through the existing interview graph.
    """
    if not payload.is_final:
        state_data = InterviewRepository.get_interview_state(db=db, candidate_id=payload.candidate_id)
        if not state_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found. Please start the interview first.",
            )
        state = InterviewState(**state_data)
        return MessageResponse(
            response=state.question_history[-1] if state.question_history else "Listening...",
            profile_completion_percentage=calculate_completion(state.evidence_map),
            interview_phase=state.interview_phase,
            interview_status=state.interview_status,
            debug_state=build_debug_state(state),
        )

    transcript = payload.transcript.strip()
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty.",
        )

    if payload.room_name:
        InterviewRepository.update_live_session_status(db=db, room_name=payload.room_name, status="active")

    return process_candidate_message(payload.candidate_id, transcript, db, agent="VoiceEvaluationAgent")


@router.post("/session/end")
def end_live_session(payload: LiveSessionEndRequest, db: Session = Depends(get_db)):
    db_session = InterviewRepository.update_live_session_status(
        db=db,
        room_name=payload.room_name,
        status="ended",
    )
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Live session not found.",
        )
    return {"status": "ended", "room_name": payload.room_name}
