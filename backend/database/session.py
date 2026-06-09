import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.database.models import Base

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Use local SQLite as database fallback
    sqlite_db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "interview_agent.db")
    DATABASE_URL = f"sqlite:///{sqlite_db_path}"
    print(f"No DATABASE_URL set. Falling back to local SQLite: {DATABASE_URL}")

# SQLite requires different arguments for thread safety
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """
    Creates all database tables defined in the SQLAlchemy models.
    """
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized.")

def get_db():
    """
    FastAPI dependency that provides a transactional database session context.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
