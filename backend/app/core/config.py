"""
LaboStock - Laboratory Stock Management System
Configuration Settings
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    ENVIRONMENT: str = "local"

    APP_NAME: str = "LaboStock"
    APP_VERSION: str = "1.0.0"

    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT == "local"

    # Database - SQLite en local, PostgreSQL en prod
    DATABASE_URL: str = "sqlite:///./labmanage.db"

    # Used by the test suite and by some alert logic; keep them explicit so
    # they can safely exist in .env or .env.test without crashing startup.
    TEST_DATABASE_URL: str | None = None
    ALERT_CHECK_INTERVAL_HOURS: int = 24
    EXPIRY_ALERT_DAYS_BEFORE: int = 30

    @property
    def database_url_fixed(self) -> str:
        """
        Render fournit parfois 'postgres://' mais SQLAlchemy
        exige 'postgresql://' → on corrige automatiquement
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # CORS
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,"
        "https://labmanage-sojy.onrender.com,https://labmanage.vercel.app,"
        "https://labmanage.onrender.com"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin Configuration
    FIRST_ADMIN_NAME: str = "Administrator"
    FIRST_ADMIN_EMAIL: str = "admin@labo.sn"
    FIRST_ADMIN_PASSWORD: str = "Admin@2024!"


# Create global settings instance
settings = Settings()
