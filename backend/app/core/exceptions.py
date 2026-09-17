"""Business exceptions.

Services raise these instead of fastapi.HTTPException (see CLAUDE.md,
"Backend — architecture"). The global handler registered in main.py
converts them to HTTP responses in the exact same JSON shape FastAPI's
default HTTPException handler already produces: {"detail": <message>},
with the given status code and optional headers.

Domain-specific subclasses (e.g. ProductNotFoundError, InsufficientStockError)
are added module by module during the refactor, next to the domain that
raises them — this file only holds the shared base and generic cases.
"""


class AppError(Exception):
    """Base class for all business exceptions."""

    status_code: int = 500
    detail: str = "Internal server error"

    def __init__(
        self,
        detail: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        if detail is not None:
            self.detail = detail
        self.headers = headers
        super().__init__(self.detail)


class NotFoundError(AppError):
    """A requested resource does not exist."""

    status_code = 404
    detail = "Resource not found"


class ConflictError(AppError):
    """The request conflicts with the current state (e.g. duplicate unique field)."""

    status_code = 409
    detail = "Conflict"


class ValidationAppError(AppError):
    """A business rule rejected the request (not a schema/type validation error)."""

    status_code = 400
    detail = "Invalid request"


class PermissionDeniedError(AppError):
    """The current user is not allowed to perform this action."""

    status_code = 403
    detail = "Access denied"


class UnauthorizedError(AppError):
    """The request is not authenticated, or the credentials are invalid."""

    status_code = 401
    detail = "Not authenticated"
