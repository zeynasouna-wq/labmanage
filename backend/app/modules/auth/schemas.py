from pydantic import BaseModel, EmailStr

from app.models.models import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: UserRole
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str
