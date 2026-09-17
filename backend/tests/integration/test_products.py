"""Integration tests freezing the CURRENT behavior of /products (incl. lots).

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import (
    Product,
    ProductLot,
    Supplier,
    User,
    UserRole,
    UserStatus,
)


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


def make_product(
    db_session, *, name="Ethanol", reference="REF-001", is_active=True, **kw
) -> Product:
    product = Product(name=name, reference=reference, is_active=is_active, **kw)
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


# ─── GET /products/ ──────────────────────────────────────────────────────────


def test_list_products_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_product(db_session, name="A", reference="REF-A")
    make_product(db_session, name="B", reference="REF-B")

    response = client.get("/products/", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2


def test_list_products_defaults_to_active_only(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_product(db_session, name="Active", reference="REF-ACTIVE", is_active=True)
    make_product(db_session, name="Archived", reference="REF-ARCHIVED", is_active=False)

    response = client.get("/products/", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Active"


def test_list_products_search_filters_by_name_or_reference(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    make_product(db_session, name="Sodium Chloride", reference="ETH-96")
    make_product(db_session, name="Potassium Iodide", reference="POT-01")

    response = client.get("/products/?search=eth", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["reference"] == "ETH-96"


def test_list_products_filters_by_supplier(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    supplier = Supplier(name="ACME")
    db_session.add(supplier)
    db_session.commit()
    make_product(db_session, name="A", reference="REF-A", supplier_id=supplier.id)
    make_product(db_session, name="B", reference="REF-B")

    response = client.get(
        f"/products/?supplier_id={supplier.id}", headers=auth_headers(viewer)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "A"


# ─── POST /products/ ─────────────────────────────────────────────────────────


def test_create_product_as_technician_returns_201(client, db_session):
    tech = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)

    response = client.post(
        "/products/",
        json={
            "name": "New Product",
            "reference": "NP-001",
            "minimum_stock": 5,
            "alert_stock": 2,
        },
        headers=auth_headers(tech),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "New Product"
    assert body["current_stock"] == 0
    assert body["lots"] == []


def test_create_product_with_initial_lots_syncs_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/",
        json={
            "name": "With Lots",
            "reference": "WL-001",
            "lots": [
                {"lot_number": "L1", "quantity": 10},
                {"lot_number": "L2", "quantity": 5},
            ],
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["current_stock"] == 15
    assert len(body["lots"]) == 2


def test_create_product_duplicate_reference_returns_409(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_product(db_session, name="Existing", reference="DUP-001")

    response = client.post(
        "/products/",
        json={"name": "New", "reference": "DUP-001"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Un produit avec la référence 'DUP-001' existe déjà"
    }


def test_create_product_unknown_supplier_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/",
        json={"name": "X", "reference": "X-001", "supplier_id": 999999},
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Fournisseur introuvable"}


def test_create_product_unknown_location_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/",
        json={"name": "X", "reference": "X-002", "location_id": 999999},
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Emplacement introuvable"}


def test_create_product_unknown_category_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/",
        json={"name": "X", "reference": "X-003", "category_id": 999999},
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Catégorie introuvable"}


def test_create_product_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.post(
        "/products/",
        json={"name": "X", "reference": "X-004"},
        headers=auth_headers(viewer),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les admins et techniciens peuvent créer des produits"
    }


def test_create_product_empty_name_returns_422(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/",
        json={"name": "   ", "reference": "X-005"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 422


# ─── GET /products/{id} ──────────────────────────────────────────────────────


def test_get_product_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    product = make_product(db_session)

    response = client.get(f"/products/{product.id}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == product.id


def test_get_unknown_product_returns_404(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/products/999999", headers=auth_headers(viewer))

    assert response.status_code == 404
    assert response.json() == {"detail": "Produit introuvable"}


# ─── PATCH /products/{id} ────────────────────────────────────────────────────


def test_update_product_as_admin_returns_200(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)

    response = client.patch(
        f"/products/{product.id}",
        json={"minimum_stock": 20},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["minimum_stock"] == 20


def test_update_product_duplicate_reference_returns_409(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    make_product(db_session, name="A", reference="REF-A")
    product_b = make_product(db_session, name="B", reference="REF-B")

    response = client.patch(
        f"/products/{product_b.id}",
        json={"reference": "REF-A"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Un produit avec la référence 'REF-A' existe déjà"
    }


def test_update_product_as_technician_returns_403(client, db_session):
    """Only admins can update — technicians can create but not update."""
    tech = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)
    product = make_product(db_session)

    response = client.patch(
        f"/products/{product.id}", json={"minimum_stock": 1}, headers=auth_headers(tech)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut modifier les produits"
    }


# ─── DELETE /products/{id} ───────────────────────────────────────────────────


def test_delete_product_as_admin_returns_204(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)

    response = client.delete(f"/products/{product.id}", headers=auth_headers(admin))

    assert response.status_code == 204
    assert response.content == b""


def test_delete_product_as_technician_returns_403(client, db_session):
    tech = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)
    product = make_product(db_session)

    response = client.delete(f"/products/{product.id}", headers=auth_headers(tech))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut supprimer les produits"
    }


# ─── Lots ─────────────────────────────────────────────────────────────────────


def test_get_lots_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    product = make_product(db_session)
    db_session.add(ProductLot(product_id=product.id, lot_number="L1", quantity=3))
    db_session.commit()

    response = client.get(f"/products/{product.id}/lots", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_add_lot_syncs_product_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)

    response = client.post(
        f"/products/{product.id}/lots",
        json={"lot_number": "L1", "quantity": 7},
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    assert response.json()["quantity"] == 7

    product_response = client.get(
        f"/products/{product.id}", headers=auth_headers(admin)
    )
    assert product_response.json()["current_stock"] == 7


def test_add_lot_unknown_product_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/products/999999/lots",
        json={"lot_number": "L1", "quantity": 1},
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Produit introuvable"}


def test_add_lot_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    product = make_product(db_session)

    response = client.post(
        f"/products/{product.id}/lots",
        json={"lot_number": "L1", "quantity": 1},
        headers=auth_headers(viewer),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les admins et techniciens peuvent ajouter des lots"
    }


def test_update_lot_syncs_product_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)
    lot = ProductLot(product_id=product.id, lot_number="L1", quantity=5)
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    response = client.patch(
        f"/products/{product.id}/lots/{lot.id}",
        json={"lot_number": "L1-renamed", "quantity": 12},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 12

    product_response = client.get(
        f"/products/{product.id}", headers=auth_headers(admin)
    )
    assert product_response.json()["current_stock"] == 12


def test_update_unknown_lot_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)

    response = client.patch(
        f"/products/{product.id}/lots/999999",
        json={"lot_number": "X", "quantity": 1},
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Lot introuvable"}


def test_update_lot_as_viewer_returns_403(client, db_session):
    """update_lot/delete_lot use require_technician_or_admin directly (a
    FastAPI dependency), not PermissionChecker — a different message than
    the other 403s in this router, frozen here as-is."""
    viewer = make_user(db_session, role=UserRole.viewer)
    product = make_product(db_session)
    lot = ProductLot(product_id=product.id, lot_number="L1", quantity=1)
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    response = client.patch(
        f"/products/{product.id}/lots/{lot.id}",
        json={"lot_number": "X", "quantity": 1},
        headers=auth_headers(viewer),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Accès réservé aux techniciens et administrateurs"
    }


def test_delete_lot_syncs_product_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)
    lot = ProductLot(product_id=product.id, lot_number="L1", quantity=8)
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    response = client.delete(
        f"/products/{product.id}/lots/{lot.id}", headers=auth_headers(admin)
    )

    assert response.status_code == 204

    product_response = client.get(
        f"/products/{product.id}", headers=auth_headers(admin)
    )
    assert product_response.json()["current_stock"] == 0


def test_delete_unknown_lot_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product = make_product(db_session)

    response = client.delete(
        f"/products/{product.id}/lots/999999", headers=auth_headers(admin)
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Lot introuvable"}


def test_delete_lot_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    product = make_product(db_session)
    lot = ProductLot(product_id=product.id, lot_number="L1", quantity=1)
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(lot)

    response = client.delete(
        f"/products/{product.id}/lots/{lot.id}", headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Accès réservé aux techniciens et administrateurs"
    }
