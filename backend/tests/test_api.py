import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.session import Base, engine

@pytest.fixture(scope="module")
def client():
    # Setup test database tables
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    # Teardown
    Base.metadata.drop_all(bind=engine)

def test_api_health_check(client):
    """
    Checks that the root endpoint is online.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_api_interview_flow(client):
    """
    Tests starting an interview, posting answers, and loading candidate dashboards.
    """
    # 1. Start interview
    start_res = client.post("/interview/start", json={
        "name": "Jane Miller",
        "email": "jane.miller@test.com"
    })
    assert start_res.status_code == 200
    res_data = start_res.json()
    assert "candidate_id" in res_data
    assert "question" in res_data
    
    candidate_id = res_data["candidate_id"]

    # 2. Send answer message
    msg_res = client.post("/interview/message", json={
        "candidate_id": candidate_id,
        "message": "I want to transition because I love building software tools in python."
    })
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert "response" in msg_data
    assert "profile_completion_percentage" in msg_data
    assert "interview_phase" in msg_data
    assert "interview_status" in msg_data

    # 3. Read profile
    profile_res = client.get(f"/interview/profile/{candidate_id}")
    assert profile_res.status_code == 200
    profile_data = profile_res.json()
    assert profile_data["candidate_name"] == "Jane Miller"
    assert profile_data["email"] == "jane.miller@test.com"

    # 4. Try load candidate details on dashboard (should work even if not fully completed)
    detail_res = client.get(f"/dashboard/candidate/{candidate_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert "profile" in detail_data
    assert "logs" in detail_data
    assert len(detail_data["logs"]) >= 1
