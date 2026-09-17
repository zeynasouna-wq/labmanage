"""Sanity checks for the test infrastructure itself (fixtures in conftest.py),
not a business domain. Domain integration tests live in tests/integration/.
"""

from app.models.models import Supplier


def test_client_hits_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_db_session_is_isolated_between_tests_a(db_session):
    db_session.add(Supplier(name="Smoke Test Supplier"))
    db_session.commit()
    assert db_session.query(Supplier).count() == 1


def test_db_session_is_isolated_between_tests_b(db_session):
    # If the previous test's commit had leaked past its transaction rollback,
    # this would find a row here too.
    assert db_session.query(Supplier).count() == 0
