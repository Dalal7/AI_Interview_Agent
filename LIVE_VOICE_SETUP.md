# Live Voice Interview Setup

This project supports a LiveKit + Gemini Live voice interview path alongside the existing text interview.

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in:

```bash
GOOGLE_API_KEY=your_google_ai_studio_key
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
INTERVIEW_API_BASE_URL=http://localhost:8000
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_LIVE_VOICE=Puck
```

The frontend never receives LiveKit secrets. It asks FastAPI for temporary participant tokens.

## Run Locally

Terminal 1:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Terminal 3:

```bash
python -m backend.livekit_agent dev
```

Then sign in as a candidate and open:

```text
http://localhost:3000/voice-interview
```

## Flow

The candidate creates a LiveKit room through `/live/session`, receives a temporary token from `/live/token`, and joins the room from the browser. The Python worker joins the same room, uses Gemini Live for realtime voice, and sends finalized answers to `/live/voice-turn`. That endpoint uses the same LangGraph pipeline as the text interview, so dashboard data and reports stay consistent.
