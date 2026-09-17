import os
from pathlib import Path

from dotenv import load_dotenv

# .env.test only (not .env): app.core.config.Settings parses .env itself
# with no extra="ignore", so TEST_DATABASE_URL living there would crash
# Settings() at import — see backend/.env.example and docs/REFACTOR_LOG.md
# (phase 2) for the pre-existing bug this works around.
load_dotenv(Path(__file__).resolve().parents[1] / ".env.test")

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL must be set to run the test suite "
        "(see backend/.env.example and CLAUDE.md 'Backend — tests')"
    )
if "test" not in TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL does not look like a test database "
        "(expected 'test' in the URL) — refusing to run against it"
    )

# app.db.session builds its engine from DATABASE_URL at import time, so this
# must be set before any `app.*` module is imported below.
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

from app.db.session import Base, get_db
from main import app

# NOTE: alembic upgrade head currently creates no tables at all — every
# migration in backend/alembic/versions/ has an empty upgrade() (see
# docs/REFACTOR_LOG.md, phase 2). Production only gets its schema from
# Base.metadata.create_all() in main.py, so the test database is built the
# same way here (decision validated by the user) until the migrations are
# fixed to reflect the real schema.
test_engine = create_engine(TEST_DATABASE_URL)


@pytest.fixture(scope="session", autouse=True)
def _test_schema():
    Base.metadata.create_all(bind=test_engine)
    yield


@pytest.fixture()
def db_session():
    """A session bound to a single connection/transaction, rolled back after the test.

    Application code calling db.commit() only ends a SAVEPOINT here (via the
    after_transaction_end listener below), not the outer transaction, so
    nothing persists once the test finishes.
    """
    connection = test_engine.connect()
    outer_transaction = connection.begin()
    session_factory = sessionmaker(bind=connection)
    session = session_factory()

    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    """TestClient with get_db overridden to use the rolled-back test session.

    Instantiated without a `with` block on purpose: Starlette's TestClient
    only runs lifespan (startup/shutdown) events inside a context manager,
    and main.py's startup event auto-creates an admin user via its own
    SessionLocal() — bypassing this fixture's transaction and polluting the
    test database across runs. Skipping lifespan avoids that.
    """

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
