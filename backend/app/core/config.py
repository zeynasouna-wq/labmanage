from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "LaboStock"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SECRET_KEY: str = "changeme-super-secret-key-min-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite:///./labo_stock.db"

    FIRST_ADMIN_EMAIL: str = "admin@labo.sn"
    FIRST_ADMIN_PASSWORD: str = "Admin@2024!"
    FIRST_ADMIN_NAME: str = "Administrateur"

    ALERT_CHECK_INTERVAL_HOURS: int = 24
    EXPIRY_ALERT_DAYS_BEFORE: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()