"""Integration tests freezing the CURRENT behavior of /movements.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out and HTTPException is replaced with business exceptions.

Movements has a side effect on Alert rows (out_of_stock/low_stock/expired/
expiry_soon), even though there is no /alerts router yet (see
docs/REFACTOR_LOG.md — alerts is reserved for a future feat, not this
refactor). That side effect is part of movements' current behavior and is
tested here by querying the Alert table directly.
"""

from app.core.security import create_access_token, get_password_hash
from app.models.models import (
    Alert,
    AlertStatus,
    AlertType,
    Product,
    ProductLot,
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


def make_product_with_lot(
    db_session, *, quantity=10, alert_stock=0, name="Ethanol", reference="REF-001"
):
    product = Product(
        name=name, reference=reference, alert_stock=alert_stock, current_stock=quantity
    )
    db_session.add(product)
    db_session.commit()
    lot = ProductLot(product_id=product.id, lot_number="L1", quantity=quantity)
    db_session.add(lot)
    db_session.commit()
    db_session.refresh(product)
    db_session.refresh(lot)
    return product, lot


# ─── GET /movements/ ─────────────────────────────────────────────────────────


def test_list_movements_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=10)

    client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    response = client.get("/movements/", headers=auth_headers(viewer))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["product_name"] == "Ethanol"
    assert body["items"][0]["user_name"] == "Test User"
    assert body["items"][0]["lot_number"] == "L1"


def test_list_movements_filters_by_product(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product_a, lot_a = make_product_with_lot(db_session, name="A", reference="REF-A")
    product_b, lot_b = make_product_with_lot(db_session, name="B", reference="REF-B")
    client.post(
        "/movements/",
        json={
            "product_id": product_a.id,
            "lot_id": lot_a.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    )
    client.post(
        "/movements/",
        json={
            "product_id": product_b.id,
            "lot_id": lot_b.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    )

    response = client.get(
        f"/movements/?product_id={product_a.id}", headers=auth_headers(viewer)
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["product_id"] == product_a.id


# ─── POST /movements/ ────────────────────────────────────────────────────────


def test_create_entry_movement_increases_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=10)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["stock_before"] == 10
    assert body["stock_after"] == 15

    product_response = client.get(
        f"/products/{product.id}", headers=auth_headers(admin)
    )
    assert product_response.json()["current_stock"] == 15


def test_create_exit_movement_decreases_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=10)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "exit",
            "quantity": 4,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["stock_before"] == 10
    assert body["stock_after"] == 6


def test_create_exit_movement_insufficient_stock_returns_400(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=3)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "exit",
            "quantity": 10,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Stock insuffisant dans ce lot. Disponible: 3, Demandé: 10"
    }


def test_create_adjustment_movement_sets_absolute_value(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=10)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "adjustment",
            "quantity": 42,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["stock_before"] == 10
    assert body["stock_after"] == 42


def test_create_movement_unknown_product_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.post(
        "/movements/",
        json={
            "product_id": 999999,
            "lot_id": 1,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Produit introuvable"}


def test_create_movement_lot_not_belonging_to_product_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    _product_a, lot_a = make_product_with_lot(db_session, name="A", reference="REF-A")
    product_b, _lot_b = make_product_with_lot(db_session, name="B", reference="REF-B")

    response = client.post(
        "/movements/",
        json={
            "product_id": product_b.id,
            "lot_id": lot_a.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Lot introuvable pour ce produit"}


def test_create_movement_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    product, lot = make_product_with_lot(db_session)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(viewer),
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les admins et techniciens peuvent créer des mouvements"
    }


def test_create_movement_triggers_out_of_stock_alert(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=5)

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "exit",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    alert = (
        db_session.query(Alert)
        .filter(
            Alert.product_id == product.id, Alert.alert_type == AlertType.out_of_stock
        )
        .first()
    )
    assert alert is not None
    assert alert.status == AlertStatus.active


def test_create_movement_resolves_out_of_stock_alert_once_restocked(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=5)
    client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "exit",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    response = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    )

    assert response.status_code == 201
    alert = (
        db_session.query(Alert)
        .filter(
            Alert.product_id == product.id, Alert.alert_type == AlertType.out_of_stock
        )
        .first()
    )
    assert alert.status == AlertStatus.resolved


# ─── GET /movements/{id} ─────────────────────────────────────────────────────


def test_get_movement_as_viewer_returns_200(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session)
    created = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    ).json()

    response = client.get(f"/movements/{created['id']}", headers=auth_headers(viewer))

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_unknown_movement_returns_404(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/movements/999999", headers=auth_headers(viewer))

    assert response.status_code == 404
    assert response.json() == {"detail": "Mouvement introuvable"}


# ─── DELETE /movements/{id} ──────────────────────────────────────────────────


def test_delete_entry_movement_reverts_stock(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session, quantity=10)
    created = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 5,
        },
        headers=auth_headers(admin),
    ).json()
    assert created["stock_after"] == 15

    response = client.delete(f"/movements/{created['id']}", headers=auth_headers(admin))

    assert response.status_code == 204
    product_response = client.get(
        f"/products/{product.id}", headers=auth_headers(admin)
    )
    assert product_response.json()["current_stock"] == 10


def test_delete_movement_as_viewer_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    product, lot = make_product_with_lot(db_session)
    created = client.post(
        "/movements/",
        json={
            "product_id": product.id,
            "lot_id": lot.id,
            "movement_type": "entry",
            "quantity": 1,
        },
        headers=auth_headers(admin),
    ).json()

    response = client.delete(
        f"/movements/{created['id']}", headers=auth_headers(viewer)
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les techniciens et administrateurs peuvent supprimer les mouvements"
    }


def test_delete_unknown_movement_returns_404(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.delete("/movements/999999", headers=auth_headers(admin))

    assert response.status_code == 404
    assert response.json() == {"detail": "Mouvement introuvable"}
