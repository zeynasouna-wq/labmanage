"""Integration tests freezing the CURRENT behavior of /suppliers.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import Product, Supplier, User, UserRole, UserStatus


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


def make_supplier(db_session, *, name="ACME Corp") -> Supplier:
    supplier = Supplier(name=name, contact="Jane Doe", email="jane@acme.test")
    db_session.add(supplier)
    db_session.commit()
    db_session.refresh(supplier)
    return supplier


# ─── GET /suppliers/ ─────────────────────────────────────────────────────────


def test_list_suppliers_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_supplier(db_session, name="A Corp")
    make_supplier(db_session, name="B Corp")

    response = client.get("/suppliers/", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["pages"] == 1
    assert {s["name"] for s in body["items"]} == {"A Corp", "B Corp"}


def test_list_suppliers_search_filters_by_name(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_supplier(db_session, name="Alpha Labs")
    make_supplier(db_session, name="Beta Chemicals")

    response = client.get("/suppliers/?search=alpha", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Alpha Labs"


def test_list_suppliers_pagination(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    for i in range(5):
        make_supplier(db_session, name=f"Supplier {i}")

    response = client.get("/suppliers/?page=2&size=2", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5
    assert body["page"] == 2
    assert body["size"] == 2
    assert body["pages"] == 3
    assert len(body["items"]) == 2


# ─── POST /suppliers/ ────────────────────────────────────────────────────────


def test_create_supplier_as_admin_returns_201(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/suppliers/",
        json={"name": "New Supplier", "contact": "John", "email": "john@ns.test"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New Supplier"
    assert body["contact"] == "John"


def test_create_supplier_duplicate_name_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_supplier(db_session, name="Dup Corp")

    response = client.post(
        "/suppliers/", json={"name": "Dup Corp"}, headers=auth_headers(admin)
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Un fournisseur avec ce nom existe déjà"}


def test_create_supplier_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.post(
        "/suppliers/", json={"name": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut créer des fournisseurs"
    }


# ─── GET /suppliers/{id} ─────────────────────────────────────────────────────


def test_get_supplier_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    supplier = make_supplier(db_session)

    response = client.get(f"/suppliers/{supplier.id}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == supplier.id


def test_get_unknown_supplier_returns_404(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/suppliers/999999", headers=auth_headers(viewer))

    assert response.status_code == 404
    assert response.json() == {"detail": "Fournisseur introuvable"}


# ─── PATCH /suppliers/{id} ───────────────────────────────────────────────────


def test_update_supplier_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    supplier = make_supplier(db_session)

    response = client.patch(
        f"/suppliers/{supplier.id}",
        json={"contact": "New Contact"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["contact"] == "New Contact"


def test_update_supplier_name_conflict_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_supplier(db_session, name="Taken Name")
    supplier = make_supplier(db_session, name="Original Name")

    response = client.patch(
        f"/suppliers/{supplier.id}",
        json={"name": "Taken Name"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Un fournisseur avec ce nom existe déjà"}


def test_update_supplier_same_name_is_allowed(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    supplier = make_supplier(db_session, name="Same Name")

    response = client.patch(
        f"/suppliers/{supplier.id}",
        json={"name": "Same Name", "phone": "12345"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["phone"] == "12345"


def test_update_supplier_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    supplier = make_supplier(db_session)

    response = client.patch(
        f"/suppliers/{supplier.id}", json={"contact": "X"}, headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut modifier les fournisseurs"
    }


# ─── DELETE /suppliers/{id} ──────────────────────────────────────────────────


def test_delete_supplier_as_admin_returns_204(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    supplier = make_supplier(db_session)

    response = client.delete(f"/suppliers/{supplier.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""


def test_delete_supplier_with_products_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    supplier = make_supplier(db_session)
    db_session.add(Product(name="P1", reference="REF-1", supplier_id=supplier.id))
    db_session.commit()

    response = client.delete(f"/suppliers/{supplier.id}", headers=auth_headers(admin))

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Cannot delete supplier with 1 product(s). Remove products first."
    }


def test_delete_supplier_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    supplier = make_supplier(db_session)

    response = client.delete(f"/suppliers/{supplier.id}", headers=auth_headers(viewer))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut supprimer les fournisseurs"
    }
