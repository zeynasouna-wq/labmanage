"""Integration tests freezing the CURRENT behavior of /export.

Written before any refactor of this module (CLAUDE.md workflow step 3).
Must keep passing, unmodified, once router/schemas/models/service/repository
are split out.

Note: this router has no business-exception cases (no 404/400/409) — every
handler just wraps the whole call in try/except Exception -> HTTPException
500. That's frozen as-is; it's not touched or tested for the 500 branch
(there's no reachable failure mode from a clean call in these tests).
"""

import csv
import io
import zipfile

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


def read_csv_rows(content: bytes) -> list[list[str]]:
    return list(csv.reader(io.StringIO(content.decode("utf-8"))))


# ─── Permission checks (same PermissionChecker.can_export_data on every route) ──


def test_export_all_as_non_admin_returns_403(client, db_session):
    viewer = make_user(db_session, role=UserRole.viewer)

    response = client.get("/export/csv/all", headers=auth_headers(viewer))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut exporter les données"
    }


def test_export_products_as_technician_returns_403(client, db_session):
    tech = make_user(db_session, email="tech@labo.sn", role=UserRole.technician)

    response = client.get("/export/csv/products", headers=auth_headers(tech))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seul un administrateur peut exporter les données"
    }


# ─── /export/csv/all ─────────────────────────────────────────────────────────


def test_export_all_as_admin_returns_zip_with_all_files(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    db_session.add(Product(name="P1", reference="REF-1"))
    db_session.commit()

    response = client.get("/export/csv/all", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=labmanage_export.zip"
    )

    zf = zipfile.ZipFile(io.BytesIO(response.content))
    names = {n.split("_", 2)[-1] for n in zf.namelist()}
    assert names == {
        "products.csv",
        "stock_movements.csv",
        "alerts.csv",
        "users.csv",
        "suppliers.csv",
        "locations.csv",
        "categories.csv",
        "product_lots.csv",
    }


# ─── /export/csv/products ────────────────────────────────────────────────────


def test_export_products_csv_content(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)
    supplier = Supplier(name="ACME")
    db_session.add(supplier)
    db_session.commit()
    db_session.add(
        Product(
            name="Ethanol", reference="ETH-1", supplier_id=supplier.id, current_stock=10
        )
    )
    db_session.commit()

    response = client.get("/export/csv/products", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert (
        response.headers["content-disposition"] == "attachment; filename=produits.csv"
    )

    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Nom",
        "Référence",
        "Description",
        "Stock Actuel",
        "Stock Minimum",
        "Stock Alerte",
        "Actif",
        "Fournisseur",
        "Localisation",
        "Catégorie",
        "Date Création",
        "Date Modification",
    ]
    data_row = rows[1]
    assert data_row[1] == "Ethanol"
    assert data_row[2] == "ETH-1"
    assert data_row[4] == "10"
    assert data_row[7] == "Oui"
    assert data_row[8] == "ACME"


# ─── /export/csv/movements ───────────────────────────────────────────────────


def test_export_movements_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/movements", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=mouvements_stock.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Produit",
        "Type Mouvement",
        "Quantité",
        "Stock Avant",
        "Stock Après",
        "Numéro Lot",
        "Raison",
        "Document Référence",
        "Utilisateur",
        "Date",
    ]


# ─── /export/csv/alerts ──────────────────────────────────────────────────────


def test_export_alerts_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/alerts", headers=auth_headers(admin))

    assert response.status_code == 200
    assert response.headers["content-disposition"] == "attachment; filename=alertes.csv"
    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Produit",
        "Type Alerte",
        "Statut",
        "Message",
        "Déclenché À",
        "Reconnu À",
        "Reconnu Par",
        "Résolu À",
    ]


# ─── /export/csv/users ───────────────────────────────────────────────────────


def test_export_users_csv_content(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/users", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=utilisateurs.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Nom",
        "Email",
        "Rôle",
        "Statut",
        "Actif",
        "Dernière Connexion",
        "Date Création",
    ]
    emails = {row[2] for row in rows[1:]}
    assert "admin@labo.sn" in emails


# ─── /export/csv/suppliers ───────────────────────────────────────────────────


def test_export_suppliers_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/suppliers", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=fournisseurs.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Nom",
        "Contact",
        "Email",
        "Téléphone",
        "Adresse",
        "Date Création",
    ]


# ─── /export/csv/locations ───────────────────────────────────────────────────


def test_export_locations_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/locations", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=localisations.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == ["ID", "Nom", "Description", "Contrôle Température"]


# ─── /export/csv/categories ──────────────────────────────────────────────────


def test_export_categories_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/categories", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"] == "attachment; filename=categories.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == ["ID", "Nom", "Description", "Couleur"]


# ─── /export/csv/lots ────────────────────────────────────────────────────────


def test_export_lots_csv_headers(client, db_session):
    admin = make_user(db_session, email="admin@labo.sn", role=UserRole.admin)

    response = client.get("/export/csv/lots", headers=auth_headers(admin))

    assert response.status_code == 200
    assert (
        response.headers["content-disposition"]
        == "attachment; filename=lots_produits.csv"
    )
    rows = read_csv_rows(response.content)
    assert rows[0] == [
        "ID",
        "Produit",
        "Numéro Lot",
        "Quantité",
        "Date Expiration",
        "Date Réception",
        "Notes",
    ]
