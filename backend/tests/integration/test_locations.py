"""Integration tests freezing the CURRENT behavior of /locations.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.

Note: unlike /suppliers, this router has no "duplicate name" guard and no
"delete blocked if still referenced" guard — that asymmetry is pre-existing
(see docs/REFACTOR_LOG.md) and is deliberately frozen as-is here, not fixed.
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import Location, User, UserRole, UserStatus


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


def make_location(db_session, *, name="Fridge A") -> Location:
    location = Location(
        name=name, description="Cold storage", temperature_controlled=True
    )
    db_session.add(location)
    db_session.commit()
    db_session.refresh(location)
    return location


# ─── GET /locations/ ─────────────────────────────────────────────────────────


def test_list_locations_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_location(db_session, name="A")
    make_location(db_session, name="B")

    response = client.get("/locations/", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert {loc["name"] for loc in body} == {"A", "B"}


# ─── POST /locations/ ────────────────────────────────────────────────────────


def test_create_location_as_admin_returns_201(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/locations/",
        json={
            "name": "Freezer 1",
            "description": "-20C",
            "temperature_controlled": True,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Freezer 1"
    assert body["temperature_controlled"] is True


# NOTE: unlike /suppliers, this router has no application-level "duplicate
# name" guard before insert. Location.name has a DB-level UNIQUE constraint
# though, so POSTing a duplicate name currently raises an unhandled
# sqlalchemy.exc.IntegrityError (crashes as a 500, not a clean 400) — a
# pre-existing bug, documented in docs/REFACTOR_LOG.md and NOT fixed or
# tested here (asserting a crash as "expected" would defeat the point of a
# regression test).


def test_create_location_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.post(
        "/locations/", json={"name": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut créer des localisations"
    }


# ─── GET /locations/{id} ─────────────────────────────────────────────────────


def test_get_location_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    location = make_location(db_session)

    response = client.get(f"/locations/{location.id}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == location.id


def test_get_unknown_location_returns_404(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/locations/999999", headers=auth_headers(viewer))

    assert response.status_code == 404
    assert response.json() == {"detail": "Localisation non trouvée"}


# ─── PATCH /locations/{id} ───────────────────────────────────────────────────


def test_update_location_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    location = make_location(db_session)

    response = client.patch(
        f"/locations/{location.id}",
        json={"name": "Renamed", "temperature_controlled": False},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Renamed"
    assert body["temperature_controlled"] is False


def test_update_unknown_location_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.patch(
        "/locations/999999", json={"name": "X"}, headers=auth_headers(admin)
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Localisation non trouvée"}


def test_update_location_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    location = make_location(db_session)

    response = client.patch(
        f"/locations/{location.id}", json={"name": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut modifier les localisations"
    }


# ─── DELETE /locations/{id} ──────────────────────────────────────────────────


def test_delete_location_as_admin_returns_204(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    location = make_location(db_session)

    response = client.delete(f"/locations/{location.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""


def test_delete_unknown_location_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.delete("/locations/999999", headers=auth_headers(admin))

    assert response.status_code == 404
    assert response.json() == {"detail": "Localisation non trouvée"}


def test_delete_location_as_technician_returns_403(client, db_session):
    """The router comment says technicians can delete, but PermissionChecker
    (app/core/permissions.py) actually restricts this to admins only — the
    real, current behavior is frozen here, not the stale comment."""
    technician = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)
    location = make_location(db_session)

    response = client.delete(
        f"/locations/{location.id}", headers=auth_headers(technician)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les techniciens et administrateurs peuvent supprimer les localisations"
    }


def test_delete_location_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    location = make_location(db_session)

    response = client.delete(f"/locations/{location.id}", headers=auth_headers(viewer))

    assert response.status_code == 403
