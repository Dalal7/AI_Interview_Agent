import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database.session import init_db
from backend.api.interview_routes import router as interview_router
from backend.api.dashboard_routes import router as dashboard_router
from backend.api.auth_routes import router as auth_router
from backend.api.evaluation_routes import router as evaluation_router
from backend.api.live_routes import router as live_router
from backend.api.blueprint_routes import router as blueprint_router
from backend.services.system_evaluation_service import SystemEvaluationService

# Run the Gemini LLM API monkey patch automatically at start
SystemEvaluationService.monkey_patch_gemini_calls()

app = FastAPI(
    title="Autonomous Interview Agent API",
    description="Backend API powering the Technical Screening Admissions workflow using LangGraph & Gemini.",
    version="1.0.0"
)

# Configure CORS for Next.js frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production security as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(interview_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(evaluation_router)
app.include_router(live_router)
app.include_router(blueprint_router)


@app.on_event("startup")
def on_startup():
    # Initialize SQL database tables (SQLite or PostgreSQL)
    init_db()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Autonomous Interview Agent Platform",
        "endpoints": [
            "/interview/start",
            "/interview/message",
            "/interview/profile/{candidate_id}",
            "/live/session",
            "/live/token",
            "/live/voice-turn",
            "/dashboard/candidates",
            "/dashboard/candidate/{candidate_id}"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
