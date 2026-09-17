"""Integration tests freezing the CURRENT behavior of /categories.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.

Note: same asymmetry as /locations (see docs/REFACTOR_LOG.md) — no
application-level duplicate-name guard despite a DB-level UNIQUE constraint
on Category.name. Not tested here (would assert an unhandled crash).
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import Category, User, UserRole, UserStatus


def make_user(db_session, *, email="user@labo.sn", role=UserRole.viewer) -> User:
    user = User(
        name="Test User",
        email=email,
        hashed_password=get_password_hash("Password123"),
        role=role,
        status=UserStatus.active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def make_category(db_session, *, name="Reagents") -> Category:
    category = Category(name=name, description="Chemical reagents", color="#ff0000")
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category


# ─── GET /categories/ ────────────────────────────────────────────────────────


def test_list_categories_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_category(db_session, name="A")
    make_category(db_session, name="B")

    response = client.get("/categories/", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert {c["name"] for c in response.json()} == {"A", "B"}


# ─── POST /categories/ ───────────────────────────────────────────────────────


def test_create_category_as_admin_returns_201(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/categories/",
        json={
            "name": "Solvents",
            "description": "Organic solvents",
            "color": "#00ff00",
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Solvents"
    assert body["color"] == "#00ff00"


def test_create_category_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.post(
        "/categories/", json={"name": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut créer des catégories"
    }


# ─── GET /categories/{id} ────────────────────────────────────────────────────


def test_get_category_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    category = make_category(db_session)

    response = client.get(f"/categories/{category.id}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == category.id


def test_get_unknown_category_returns_404(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/categories/999999", headers=auth_headers(viewer))

    assert response.status_code == 404
    assert response.json() == {"detail": "Catégorie non trouvée"}


# ─── PATCH /categories/{id} ──────────────────────────────────────────────────


def test_update_category_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    category = make_category(db_session)

    response = client.patch(
        f"/categories/{category.id}",
        json={"color": "#0000ff"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["color"] == "#0000ff"


def test_update_unknown_category_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.patch(
        "/categories/999999", json={"name": "X"}, headers=auth_headers(admin)
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Catégorie non trouvée"}


def test_update_category_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    category = make_category(db_session)

    response = client.patch(
        f"/categories/{category.id}", json={"name": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut modifier les catégories"
    }


# ─── DELETE /categories/{id} ─────────────────────────────────────────────────


def test_delete_category_as_admin_returns_204(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    category = make_category(db_session)

    response = client.delete(f"/categories/{category.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""


def test_delete_unknown_category_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.delete("/categories/999999", headers=auth_headers(admin))

    assert response.status_code == 404
    assert response.json() == {"detail": "Catégorie non trouvée"}


def test_delete_category_as_technician_returns_403(client, db_session):
    """Router comment says technicians can delete, but PermissionChecker
    actually restricts this to admins only — the real behavior, frozen here."""
    technician = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)
    category = make_category(db_session)

    response = client.delete(
        f"/categories/{category.id}", headers=auth_headers(technician)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les techniciens et administrateurs peuvent supprimer les catégories"
    }
