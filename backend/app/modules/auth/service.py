from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDeniedError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.models import UserStatus
from app.modules.auth.schemas import LoginRequest, RefreshTokenRequest, TokenResponse
from app.modules.users import repository as users_repository


def authenticate_user(db: Session, credentials: LoginRequest) -> TokenResponse:
    user = users_repository.get_by_email(db, credentials.email)

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise UnauthorizedError("Email ou mot de passe incorrect")
    if not user.is_active:
        raise PermissionDeniedError("Compte désactivé")
    if user.status == UserStatus.pending:
        raise PermissionDeniedError(
            "Compte en attente d'activation. Contactez l'administrateur."
        )
    if user.status == UserStatus.disabled:
        raise PermissionDeniedError("Compte suspendu")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user_id=user.id,
        role=user.role,
        name=user.name,
    )


def refresh_access_token(db: Session, request: RefreshTokenRequest) -> TokenResponse:
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise UnauthorizedError("Token de rafraîchissement invalide")

    user = users_repository.get_by_id(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise UnauthorizedError("Utilisateur invalide")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user_id=user.id,
        role=user.role,
        name=user.name,
    )
