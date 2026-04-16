"""
Initialize database and create first admin user with sample data
Usage: python init_db.py
"""

from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.models.models import User, UserRole, UserStatus, Supplier, Location, Category
from backend.app.core.security import get_password_hash
from backend.app.core.config import settings


def init_db():
    """Create all tables and initialize first admin user with sample data"""
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")

    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
        if admin:
            print(f"✓ Admin user already exists: {admin.email}")
        else:
            # Create first admin
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
            db.refresh(admin_user)
            
            print("✓ Admin user created successfully!")
            print(f"  Email: {admin_user.email}")
            print(f"  Name: {admin_user.name}")
            print(f"  Role: {admin_user.role.value}")

        # Create sample suppliers if none exist
        if db.query(Supplier).count() == 0:
            suppliers = [
                Supplier(
                    name="Supplier A",
                    contact="John Doe",
                    email="supplier.a@example.com",
                    phone="+221 77 123 4567",
                    address="123 Main Street, Dakar"
                ),
                Supplier(
                    name="Supplier B",
                    contact="Jane Smith",
                    email="supplier.b@example.com",
                    phone="+221 77 234 5678",
                    address="456 Oak Avenue, Thiès"
                ),
            ]
            db.add_all(suppliers)
            db.commit()
            print("✓ Sample suppliers created")

        # Create sample locations if none exist
        if db.query(Location).count() == 0:
            locations = [
                Location(
                    name="Main Storage",
                    description="Main warehouse storage room",
                    temperature_controlled=False
                ),
                Location(
                    name="Cold Storage",
                    description="Temperature controlled storage",
                    temperature_controlled=True
                ),
                Location(
                    name="Lab Bench",
                    description="Laboratory work bench",
                    temperature_controlled=False
                ),
            ]
            db.add_all(locations)
            db.commit()
            print("✓ Sample locations created")

        # Create sample categories if none exist
        if db.query(Category).count() == 0:
            categories = [
                Category(
                    name="Chemicals",
                    description="Chemical products",
                    color="#FF6B6B"
                ),
                Category(
                    name="Equipment",
                    description="Laboratory equipment",
                    color="#4ECDC4"
                ),
                Category(
                    name="Reagents",
                    description="Laboratory reagents",
                    color="#45B7D1"
                ),
                Category(
                    name="Consumables",
                    description="Lab consumables",
                    color="#96CEB4"
                ),
            ]
            db.add_all(categories)
            db.commit()
            print("✓ Sample categories created")

    except Exception as e:
        print(f"✗ Error during initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
