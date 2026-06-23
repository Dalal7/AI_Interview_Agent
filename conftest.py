import sys, os

# Isolate testing database environment from development database
test_db_path = os.path.join(os.path.dirname(__file__), "backend", "test_interview_agent.db")
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

# Make the workspace root importable so `backend.*` resolves
sys.path.insert(0, os.path.dirname(__file__))
