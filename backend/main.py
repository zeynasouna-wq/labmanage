"""
LaboStock - Laboratory Stock Management System
FastAPI Main Application
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.utils import is_body_allowed_for_status_code

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import get_password_hash

# Créer l'admin au démarrage si il n'existe pas
from app.db.session import DATABASE_URL, Base, SessionLocal, engine
from app.models.models import User, UserRole, UserStatus
from app.modules.auth.router import router as auth_router
from app.modules.locations.router import router as locations_router
from app.modules.suppliers.router import router as suppliers_router
from app.modules.users.router import router as users_router
from app.routers import (
    categories,
    export,
    movements,
    products,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Laboratory stock management and inventory tracking system",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(suppliers_router)
app.include_router(products.router)
app.include_router(movements.router)
app.include_router(categories.router)
app.include_router(locations_router)
app.include_router(export.router)


# Root endpoint
@app.get("/", tags=["Health"])
def read_root():
    """API Health Check"""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
    }


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Converts business exceptions (app/core/exceptions.py) to HTTP responses.

    Mirrors fastapi.exception_handlers.http_exception_handler exactly, so a
    service raising AppError produces the same response shape as one raising
    HTTPException(status_code=exc.status_code, detail=exc.detail).
    """
    if not is_body_allowed_for_status_code(exc.status_code):
        return Response(status_code=exc.status_code, headers=exc.headers)
    return JSONResponse(
        {"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers
    )


@app.on_event("startup")
async def startup():
    logging.basicConfig(level=logging.INFO)
    logger.info(f"==> DATABASE: {DATABASE_URL[:20]}...")

    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
        if not admin:
            admin_user = User(
                name=settings.FIRST_ADMIN_NAME,
                email=settings.FIRST_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                role=UserRole.admin,
                status=UserStatus.active,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"==> Admin créé : {settings.FIRST_ADMIN_EMAIL}")
        else:
            logger.info(f"==> Admin existe déjà : {admin.email}")
    except Exception as e:
        logger.error(f"==> Erreur création admin : {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
