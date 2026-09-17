"""Integration tests freezing the CURRENT behavior of /auth and /users.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import User, UserRole, UserStatus


def make_user(
    db_session,
    *,
    email="user@labo.sn",
    name="Test User",
    password="Password123",
    role=UserRole.viewer,
    status=UserStatus.active,
    is_active=True,
) -> User:
    user = User(
        name=name,
        email=email,
        hashed_password=get_password_hash(password),
        role=role,
        status=status,
        is_active=is_active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


# ─── POST /auth/login ──────────────────────────────────────────────────────


def test_login_success_returns_tokens_and_user_info(client, db_session):
    user = make_user(
        db_session, email="admin@labo.sn", password="Password123", role=UserRole.admin
    )

    response = client.post(
        "/auth/login", json={"email": "admin@labo.sn", "password": "Password123"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_id"] == user.id
    assert body["role"] == "admin"
    assert body["name"] == "Test User"
    assert body["access_token"]
    assert body["refresh_token"]


def test_login_wrong_password_returns_401(client, db_session):
    make_user(db_session, email="user@labo.sn", password="Password123")

    response = client.post(
        "/auth/login", json={"email": "user@labo.sn", "password": "wrong-password"}
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Email ou mot de passe incorrect"}


def test_login_unknown_email_returns_401(client, db_session):
    response = client.post(
        "/auth/login", json={"email": "nobody@labo.sn", "password": "whatever123"}
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Email ou mot de passe incorrect"}


def test_login_inactive_account_returns_403(client, db_session):
    make_user(
        db_session, email="inactive@labo.sn", password="Password123", is_active=False
    )

    response = client.post(
        "/auth/login", json={"email": "inactive@labo.sn", "password": "Password123"}
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Compte désactivé"}


def test_login_pending_account_returns_403(client, db_session):
    make_user(
        db_session,
        email="pending@labo.sn",
        password="Password123",
        status=UserStatus.pending,
    )

    response = client.post(
        "/auth/login", json={"email": "pending@labo.sn", "password": "Password123"}
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Compte en attente d'activation. Contactez l'administrateur."
    }


def test_login_disabled_status_returns_403(client, db_session):
    make_user(
        db_session,
        email="disabled@labo.sn",
        password="Password123",
        status=UserStatus.disabled,
    )

    response = client.post(
        "/auth/login", json={"email": "disabled@labo.sn", "password": "Password123"}
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "Compte suspendu"}


# ─── POST /auth/refresh ─────────────────────────────────────────────────────


def test_refresh_with_access_token_returns_401(client, db_session):
    user = make_user(db_session)
    access_token = create_access_token(user.id)

    response = client.post("/auth/refresh", json={"refresh_token": access_token})

    assert response.status_code == 401
    assert response.json() == {"detail": "Token de rafraîchissement invalide"}


def test_refresh_with_garbage_token_returns_401(client):
    response = client.post("/auth/refresh", json={"refresh_token": "not-a-jwt"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Token invalide ou expiré"}


# ─── GET /auth/me ───────────────────────────────────────────────────────────


def test_me_without_token_returns_401(client):
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


def test_me_with_valid_token_returns_current_user(client, db_session):
    user = make_user(db_session, email="me@labo.sn")

    response = client.get("/auth/me", headers=auth_headers(user))

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == user.id
    assert body["email"] == "me@labo.sn"


def test_me_with_invalid_token_returns_401(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt"})

    assert response.status_code == 401
    assert response.json() == {"detail": "Token invalide ou expiré"}


# ─── GET /users/ ────────────────────────────────────────────────────────────


def test_list_users_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)

    response = client.get("/users/", headers=auth_headers(viewer))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut lister les utilisateurs"
    }


def test_list_users_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_user(db_session, email="other@labo.sn")

    response = client.get("/users/", headers=auth_headers(admin))

    assert response.status_code == 200
    emails = {u["email"] for u in response.json()}
    assert {"admin@labo.sn", "other@labo.sn"} <= emails


# ─── POST /users/ ───────────────────────────────────────────────────────────


def test_create_user_as_admin_returns_201(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/users/",
        json={
            "name": "New Tech",
            "email": "tech@labo.sn",
            "password": "Password123",
            "role": "technician",
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "tech@labo.sn"
    assert body["role"] == "technician"
    assert body["status"] == "active"


def test_create_user_duplicate_email_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_user(db_session, email="taken@labo.sn")

    response = client.post(
        "/users/",
        json={
            "name": "Dup",
            "email": "taken@labo.sn",
            "password": "Password123",
            "role": "viewer",
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Cet email est déjà utilisé"}


def test_create_user_weak_password_returns_422(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/users/",
        json={
            "name": "Weak",
            "email": "weak@labo.sn",
            "password": "short",
            "role": "viewer",
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 422


def test_create_user_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)

    response = client.post(
        "/users/",
        json={
            "name": "X",
            "email": "x@labo.sn",
            "password": "Password123",
            "role": "viewer",
        },
        headers=auth_headers(viewer),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut créer des utilisateurs"
    }


# ─── GET /users/{id} ────────────────────────────────────────────────────────


def test_get_own_profile_as_non_admin_returns_200(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)

    response = client.get(f"/users/{viewer.id}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == viewer.id


def test_get_other_profile_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)
    other = make_user(db_session, email="other@labo.sn", role=UserRole.viewer)

    response = client.get(f"/users/{other.id}", headers=auth_headers(viewer))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Vous ne pouvez consulter que votre propre profil"
    }


def test_get_unknown_user_as_admin_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/users/999999", headers=auth_headers(admin))

    assert response.status_code == 404
    assert response.json() == {"detail": "Utilisateur introuvable"}


# ─── PATCH /users/{id} ──────────────────────────────────────────────────────


def test_update_user_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    target = make_user(db_session, email="target@labo.sn")

    response = client.patch(
        f"/users/{target.id}", json={"name": "Renamed"}, headers=auth_headers(admin)
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


def test_update_user_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)

    response = client.patch(
        f"/users/{viewer.id}", json={"name": "Hacked"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut modifier les utilisateurs"
    }


# ─── DELETE /users/{id} ─────────────────────────────────────────────────────


def test_delete_self_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.delete(f"/users/{admin.id}", headers=auth_headers(admin))

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Vous ne pouvez pas supprimer votre propre compte"
    }


def test_delete_other_user_as_admin_returns_204(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    target = make_user(db_session, email="target@labo.sn")

    response = client.delete(f"/users/{target.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""


def test_delete_user_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, email="viewer@labo.sn", role=UserRole.viewer)
    target = make_user(db_session, email="target@labo.sn")

    response = client.delete(f"/users/{target.id}", headers=auth_headers(viewer))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut supprimer des utilisateurs"
    }


# ─── POST /users/{id}/toggle-status ─────────────────────────────────────────


def test_toggle_own_status_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        f"/users/{admin.id}/toggle-status", headers=auth_headers(admin)
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Vous ne pouvez pas modifier votre propre statut"
    }


def test_toggle_other_status_as_admin_disables_active_user(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    target = make_user(
        db_session, email="target@labo.sn", is_active=True, status=UserStatus.active
    )

    response = client.post(
        f"/users/{target.id}/toggle-status", headers=auth_headers(admin)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_active"] is False
    assert body["status"] == "disabled"


# ─── POST /users/me/change-password ─────────────────────────────────────────


def test_change_password_success_returns_204(client, db_session):
    user = make_user(db_session, email="user@labo.sn", password="OldPassword1")

    response = client.post(
        "/users/me/change-password",
        json={"current_password": "OldPassword1", "new_password": "NewPassword1"},
        headers=auth_headers(user),
    )

    assert response.status_code == 204
    assert response.content == b""


def test_change_password_wrong_current_returns_400(client, db_session):
    user = make_user(db_session, email="user@labo.sn", password="OldPassword1")

    response = client.post(
        "/users/me/change-password",
        json={"current_password": "WrongPassword", "new_password": "NewPassword1"},
        headers=auth_headers(user),
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Mot de passe actuel incorrect"}
