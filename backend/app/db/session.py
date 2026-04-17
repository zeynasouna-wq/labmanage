from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def get_database_url() -> str:
    """
    Corrige l'URL pour SQLAlchemy :
    Render fournit 'postgres://' mais SQLAlchemy exige 'postgresql://'
    """
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = get_database_url()

# SQLite a besoin de check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # Pool settings utiles en production PostgreSQL
    pool_pre_ping=True,   # vérifie la connexion avant utilisation
    pool_recycle=300,     # recycle les connexions toutes les 5 min
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()