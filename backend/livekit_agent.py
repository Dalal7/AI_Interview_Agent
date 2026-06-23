import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

try:
    from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli, function_tool, RoomInputOptions
    from livekit.plugins import google
except ImportError as exc:  # pragma: no cover - optional runtime dependency
    Agent = AgentSession = JobContext = WorkerOptions = cli = function_tool = google = RoomInputOptions = None
    LIVEKIT_IMPORT_ERROR = exc
else:
    LIVEKIT_IMPORT_ERROR = None


API_BASE_URL = os.getenv("INTERVIEW_API_BASE_URL", "http://localhost:8000")
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")


async def _fetch_room_context(room_name: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{API_BASE_URL}/live/session/{room_name}")
        response.raise_for_status()
        return response.json()


def _instructions(room_context: dict[str, Any]) -> str:
    current_question = room_context.get("current_question") or (
        "Welcome. Could you briefly introduce yourself and tell me what brings you here today?"
    )
    return f"""
You are 1 Min Scout, a calm and professional live admissions interviewer for an Agentic AI bootcamp.

The backend interview engine is the source of truth. Your job is to make the conversation feel natural by voice,
but you must follow the backend-approved question sequence.

Current backend-approved question:
{current_question}

Rules:
- Start by asking the current backend-approved question.
- Ask one question at a time.
- Keep spoken responses concise and warm.
- When the candidate finishes an answer, call submit_candidate_answer with their finalized transcript.
- Use the tool response as the next official question or wrap-up message.
- Do not invent scores, admissions decisions, or final outcomes.
- If the tool response says the interview is completed, thank the candidate and stop asking new questions.
"""


if Agent is not None:
    class LiveInterviewAgent(Agent):
        def __init__(self, room_context: dict[str, Any]) -> None:
            self.room_name = room_context["room_name"]
            self.candidate_id = room_context["candidate_id"]
            super().__init__(
                instructions=_instructions(room_context),
                llm=google.realtime.RealtimeModel(
                    model=GEMINI_LIVE_MODEL,
                    voice=room_context.get("voice") or os.getenv("GEMINI_LIVE_VOICE", "Puck"),
                    temperature=0.6,
                ),
            )

        @function_tool
        async def submit_candidate_answer(self, transcript: str) -> dict[str, Any]:
            """
            Submit the candidate's finalized spoken answer to the interview backend.
            """
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{API_BASE_URL}/live/voice-turn",
                    json={
                        "candidate_id": self.candidate_id,
                        "room_name": self.room_name,
                        "transcript": transcript,
                        "is_final": True,
                        "source": "livekit_gemini",
                    },
                )
                response.raise_for_status()
                return response.json()


async def entrypoint(ctx: "JobContext") -> None:
    if LIVEKIT_IMPORT_ERROR:
        raise RuntimeError(
            "LiveKit voice dependencies are not installed. Install livekit-agents[google]."
        ) from LIVEKIT_IMPORT_ERROR

    await ctx.connect()
    room_context = await _fetch_room_context(ctx.room.name)
    session = AgentSession()
    await session.start(
        agent=LiveInterviewAgent(room_context),
        room=ctx.room,
        room_input_options=RoomInputOptions(close_on_disconnect=False)
    )


if __name__ == "__main__":
    if LIVEKIT_IMPORT_ERROR:
        raise SystemExit(
            "LiveKit voice dependencies are not installed. Run: pip install -r backend/requirements.txt"
        )
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
