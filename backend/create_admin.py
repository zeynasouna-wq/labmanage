"""
Create or update admin user
Usage: python create_admin.py [--email EMAIL] [--name NAME] [--password PASSWORD]
"""

import sys
import argparse
from app.db.session import SessionLocal, engine, Base
from app.models.models import User, UserRole, UserStatus
from app.core.security import get_password_hash
from app.core.config import settings


def create_or_update_admin(
    email: str = None,
    name: str = None, 
    password: str = None
):
    """Create or update an admin user"""
    
    # Use provided values or fall back to settings
    admin_email = email or settings.FIRST_ADMIN_EMAIL
    admin_name = name or settings.FIRST_ADMIN_NAME
    admin_password = password or settings.FIRST_ADMIN_PASSWORD
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        
        if existing_admin:
            # Update existing admin
            existing_admin.name = admin_name
            existing_admin.hashed_password = get_password_hash(admin_password)
            existing_admin.role = UserRole.admin
            existing_admin.status = UserStatus.active
            existing_admin.is_active = True
            db.commit()
            print(f"✓ Admin user updated successfully!")
            print(f"  Email: {existing_admin.email}")
            print(f"  Name: {existing_admin.name}")
            print(f"  Status: {existing_admin.status.value}")
            return existing_admin
        else:
            # Create new admin user
            admin_user = User(
                name=admin_name,
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                role=UserRole.admin,
                status=UserStatus.active,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print(f"✓ Admin user created successfully!")
            print(f"  Email: {admin_user.email}")
            print(f"  Name: {admin_user.name}")
            print(f"  Role: {admin_user.role.value}")
            print(f"  Status: {admin_user.status.value}")
            return admin_user
            
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {str(e)}")
        return None
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or update admin user")
    parser.add_argument(
        "--email",
        type=str,
        help=f"Admin email (default: {settings.FIRST_ADMIN_EMAIL})"
    )
    parser.add_argument(
        "--name",
        type=str,
        help=f"Admin name (default: {settings.FIRST_ADMIN_NAME})"
    )
    parser.add_argument(
        "--password",
        type=str,
        help="Admin password (default: hidden for security)"
    )
    
    args = parser.parse_args()
    
    print(f"\n🔧 Creating/updating admin user...")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Database: {settings.DATABASE_URL}\n")
    
    create_or_update_admin(
        email=args.email,
        name=args.name,
        password=args.password
    )
