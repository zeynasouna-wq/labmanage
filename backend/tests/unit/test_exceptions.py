"""Unit tests for app/core/exceptions.py and the global handler in main.py.

No route in the app currently raises AppError (services still raise
HTTPException directly — that migration happens per-module in phase 3), so
these tests exercise the handler directly rather than through an endpoint.
"""

import pytest
from fastapi import HTTPException
from fastapi.exception_handlers import http_exception_handler

from app.core.exceptions import AppError, NotFoundError, UnauthorizedError
from main import app_error_handler


def test_app_error_uses_class_defaults_when_no_detail_given():
    exc = NotFoundError()
    assert exc.status_code == 404
    assert exc.detail == "Resource not found"
    assert exc.headers is None


def test_app_error_detail_can_be_overridden():
    exc = NotFoundError("Product 42 not found")
    assert exc.detail == "Product 42 not found"


def test_app_error_can_carry_headers():
    exc = UnauthorizedError("Invalid token", headers={"WWW-Authenticate": "Bearer"})
    assert exc.headers == {"WWW-Authenticate": "Bearer"}


def test_settings_accepts_test_and_alert_env_vars(monkeypatch):
    monkeypatch.setenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5433/labmanage_test",
    )
    monkeypatch.setenv("ALERT_CHECK_INTERVAL_HOURS", "24")
    monkeypatch.setenv("EXPIRY_ALERT_DAYS_BEFORE", "30")

    from app.core.config import Settings

    settings = Settings()

    assert (
        settings.TEST_DATABASE_URL
        == "postgresql://postgres:postgres@localhost:5433/labmanage_test"
    )
    assert settings.ALERT_CHECK_INTERVAL_HOURS == 24
    assert settings.EXPIRY_ALERT_DAYS_BEFORE == 30


@pytest.mark.anyio
async def test_handler_matches_default_http_exception_handler_body_and_status():
    app_exc = NotFoundError("Product 42 not found")
    http_exc = HTTPException(status_code=404, detail="Product 42 not found")

    app_response = await app_error_handler(request=None, exc=app_exc)
    http_response = await http_exception_handler(request=None, exc=http_exc)

    assert app_response.status_code == http_response.status_code
    assert app_response.body == http_response.body


@pytest.mark.anyio
async def test_handler_forwards_headers():
    app_exc = UnauthorizedError("Invalid token", headers={"WWW-Authenticate": "Bearer"})
    response = await app_error_handler(request=None, exc=app_exc)
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.anyio
async def test_handler_default_status_and_detail():
    response = await app_error_handler(request=None, exc=AppError())
    assert response.status_code == 500
    assert response.body == b'{"detail":"Internal server error"}'
