"""
LaboStock - Laboratory Stock Management System
Configuration Settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "local")
    
    APP_NAME: str = "LaboStock"
    APP_VERSION: str = "1.0.0"
    
    @property
    def DEBUG(self) -> bool:
        return self.ENVIRONMENT == "local"
    
    # Database - SQLite en local, PostgreSQL en prod
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./labmanage.db")
    
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
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # CORS
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,https://labmanage.vercel.app,https://labmanage-sojy.onrender.com/"
    )
    
    @property
    def cors_origins_list(self) -> list:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # JWT Settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-this-in-production"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Admin Configuration
    FIRST_ADMIN_NAME: str = os.getenv("FIRST_ADMIN_NAME", "Administrator")
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@labo.sn")
    FIRST_ADMIN_PASSWORD: str = os.getenv("FIRST_ADMIN_PASSWORD", "Admin@2024!")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()