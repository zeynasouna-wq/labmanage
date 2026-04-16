from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── Mode : "local" ou "production" ─────────────────────────────────
    # Modifie la variable d'environnement ENV (ou le défaut ci-dessous)
    # pour basculer entre les deux environnements.
    ENV: str = "local"

    APP_NAME: str = "LaboStock"
    APP_VERSION: str = "1.0.0"

    # ── Sécurité ───────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme-super-secret-key-min-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Base de données ────────────────────────────────────────────────
    # En local   : sqlite par défaut
    # En prod    : met DATABASE_URL dans les variables d'env Render
    DATABASE_URL: str = "sqlite:///./labo_stock.db"

    # ── Admin initial ──────────────────────────────────────────────────
    FIRST_ADMIN_EMAIL: str = "admin@labo.sn"
    FIRST_ADMIN_PASSWORD: str = "Admin@2024!"
    FIRST_ADMIN_NAME: str = "Administrateur"

    # ── Alertes ────────────────────────────────────────────────────────
    ALERT_CHECK_INTERVAL_HOURS: int = 24
    EXPIRY_ALERT_DAYS_BEFORE: int = 30

    # ── CORS ───────────────────────────────────────────────────────────
    # Liste séparée par des virgules des origines autorisées.
    # Tu peux la surcharger via la variable d'env CORS_ORIGINS sur Render.
    CORS_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:8080,"
        "https://labmanage.onrender.com,"
        "https://labmanage.vercel.app"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True

    # ── Propriétés dérivées ────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.ENV.lower() == "production"

    @property
    def is_local(self) -> bool:
        return self.ENV.lower() == "local"

    @property
    def DEBUG(self) -> bool:
        # Debug seulement en local
        return self.is_local

    @property
    def cors_origins_list(self) -> List[str]:
        """Liste parsée des origines CORS."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()