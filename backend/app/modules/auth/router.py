from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.modules.auth import service
from app.modules.auth.schemas import LoginRequest, RefreshTokenRequest, TokenResponse
from app.modules.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=TokenResponse, summary="Connexion utilisateur")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authentifier un utilisateur et obtenir les tokens JWT."""
    return service.authenticate_user(db, credentials)


@router.post("/refresh", response_model=TokenResponse, summary="Rafraîchir le token")
def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Obtenir un nouveau access_token via le refresh_token."""
    return service.refresh_access_token(db, request)


@router.get("/me", response_model=UserResponse, summary="Profil utilisateur courant")
def get_me(current_user: User = Depends(get_current_user)):
    """Retourner les informations de l'utilisateur connecté."""
    return current_user
