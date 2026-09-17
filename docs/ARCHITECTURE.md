# Architecture — LabManage (NGStock)

Référence de l'architecture actuelle du projet, après le refactor décrit dans `docs/REFACTOR_LOG.md`. Ce document décrit l'état du système ; pour l'historique des décisions et des étapes, voir `REFACTOR_LOG.md`. Pour les règles de contribution (langue, workflow git, commandes), voir `CLAUDE.md`.

---

## Vue d'ensemble

| | |
|---|---|
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, PostgreSQL |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Auth | JWT (access + refresh token), stocké côté client dans `localStorage` |
| Déploiement | Backend sur Render, frontend sur Vercel |

Le frontend est une SPA à état client unique : `src/app/page.tsx` rend un seul composant racine (`AppRoot`) qui gère l'authentification et bascule entre pages via un état React (`page` dans `AppShell`), pas via le routeur de fichiers Next.js. Il n'y a qu'une seule route HTTP (`/`).

---

## Backend

### Structure par domaine

```
backend/app/modules/<domaine>/
  router.py       Routes HTTP, codes de statut, appelle service.py
  schemas.py       Modèles Pydantic d'entrée/sortie
  service.py       Règles métier, orchestration ; lève des exceptions métier
  repository.py    Lecture/écriture en base (accès SQLAlchemy direct)
```

Flux obligatoire : **router → service → repository → base**. Un router ne fait jamais de requête SQL directe ; un service ne lève jamais `HTTPException` ni n'importe `Request`.

Domaines existants sous `backend/app/modules/` :

| Domaine | Contenu |
|---|---|
| `auth` | Login, refresh token, `/auth/me`. Pas de `models.py`/`repository.py` propres (aucune table possédée) ; réutilise `modules/users/repository.py`. |
| `users` | CRUD utilisateurs, changement de mot de passe, activation/désactivation. |
| `suppliers` | CRUD fournisseurs. |
| `locations` | CRUD localisations. |
| `categories` | CRUD catégories. |
| `products` | CRUD produits + sous-ressource `lots` (`/products/{id}/lots`). Réutilise les `repository` de `suppliers`/`locations`/`categories` pour valider les clés étrangères à la création. |
| `movements` | Mouvements de stock (entrée/sortie/ajustement/perte). Met à jour `Product.current_stock` et `ProductLot.quantity`, et déclenche la création/résolution automatique d'alertes (`Alert`) — cette logique reste dans `movements` (voir « Domaines non branchés » ci-dessous). |
| `export` | Export CSV/ZIP de toutes les tables. Pas de `schemas.py` (aucune réponse Pydantic, seulement `Response`/`StreamingResponse` brutes). |

Dépendances entre domaines (imports directs de `repository`, pas de couplage circulaire) :

```
suppliers ─┐
locations ─┼─→ products ─→ movements
categories ┘         │
users ←───────────────┴─ auth (repository uniquement)
```

### Domaines non branchés

`backend/app/services/alert_service.py` et `dashboard_service.py` existent (schémas Pydantic inclus dans `app/schemas/schemas.py` : `AlertResponse`, `AlertAcknowledge`, `DashboardStats`, `StockReport`) mais **n'ont pas de router** — aucune route `/alerts` ou `/dashboard` n'est exposée. Le frontend recalcule les statistiques du tableau de bord côté client à partir de `/products` et `/movements`. Décision utilisateur (2026-09-17, voir `REFACTOR_LOG.md`) : les brancher via de nouveaux modules `modules/alerts/` et `modules/dashboard/`, en tant que `feat` séparé — pas encore fait.

### Transverse (`backend/app/core/`)

- `config.py` : `Settings` (pydantic-settings, seule source de configuration).
- `database.py` / `db/session.py` : engine, session, `get_db`.
- `security.py` : hash de mot de passe (argon2), JWT.
- `dependencies.py` : `get_current_user`, `require_admin`, `require_technician_or_admin`.
- `permissions.py` : `PermissionChecker` (vérifications de rôle par action), `PermissionDenied` (403).
- `exceptions.py` : `AppError` et ses sous-classes (`NotFoundError`, `ConflictError`, `ValidationAppError`, `PermissionDeniedError`, `UnauthorizedError`). Un handler global dans `main.py` les convertit en réponses HTTP au format **identique** à celui que produisait `HTTPException` avant le refactor (`{"detail": ...}`, mêmes codes, mêmes headers).

`app/models/models.py` reste un fichier unique partagé pour tous les modèles SQLAlchemy (pas encore éclaté par domaine — voir « Limites connues »).

### Tests

`backend/tests/` :
- `unit/` : tests sans base de données.
- `integration/` : un fichier par domaine (`test_auth_users.py`, `test_suppliers.py`, `test_locations.py`, `test_categories.py`, `test_products.py`, `test_movements.py`, `test_export.py`), utilisant `TestClient` sur une base PostgreSQL de test dédiée.
- `test_conftest_smoke.py` : sanity checks de l'infrastructure de test elle-même.

Chaque test s'exécute dans une transaction annulée à la fin (voir `tests/conftest.py`). Le schéma de test est créé via `Base.metadata.create_all()` — **pas** `alembic upgrade head`, car les migrations existantes ne créent actuellement aucune table (bug documenté dans `REFACTOR_LOG.md`, phase 2).

---

## Frontend

```
frontend/lab-manage/src/
  app/
    layout.tsx           Layout racine Next.js (polices, métadonnées)
    page.tsx              1 ligne : réexporte AppRoot
    globals.css            Boilerplate Tailwind par défaut (non utilisé par l'appli)
  components/
    ui/                    Composants génériques : icons.tsx, Modal.tsx, AccessDenied.tsx
    shell/                 Infrastructure applicative transverse (voir ci-dessous)
    Navigation.tsx, ProtectedActions.tsx, RoleGuard.tsx, RoleProtectedPage.tsx
                            Code mort — jamais importé (voir « Limites connues »)
  features/<domaine>/
    components/            Une page par domaine (ex. SuppliersPage.tsx)
    types.ts                (uniquement products/ pour l'instant)
  lib/
    api-client.ts           Client HTTP unique : api.get/post/patch/del, API_BASE
    contexts.tsx             AuthContext, NotifContext
    permissions.ts           PermissionService (miroir de core/permissions.py côté backend)
    navigation.ts, rbac.ts    Code mort — jamais importé
```

### Shell applicatif (`src/components/shell/`)

Pas prévu dans la cible générique de `CLAUDE.md`, mais nécessaire pour cette application (SPA à état unique plutôt que routage par fichiers) :

- **`AppRoot.tsx`** : composant racine (exporté par défaut depuis `page.tsx`). Gère le cycle de vie de l'authentification (lecture du token au montage, `login`/`logout`), fournit `AuthContext`/`NotifContext`, injecte les polices Google Fonts et le CSS applicatif.
- **`AppShell.tsx`** : une fois authentifié, affiche la sidebar (navigation filtrée par rôle) et bascule entre les 7 pages métier selon l'état `page`.
- **`NotifProvider.tsx`** : système de notifications toast (`NotifContext`).
- **`nav.ts`** : `NAV` (entrées de navigation + rôles autorisés) et `PAGE_META` (titres/sous-titres par page).
- **`styles.ts`** : `APP_CSS`, le CSS applicatif complet (design system fait main, ~550 lignes), injecté via `<style>{APP_CSS}</style>` dans `AppRoot`. Volontairement **pas** fusionné dans `app/globals.css`, pour ne prendre aucun risque avec l'ordre de cascade CSS entre le boilerplate Tailwind existant et ce CSS applicatif.

### Domaines (`src/features/`)

Un dossier par domaine backend correspondant : `auth`, `users`, `suppliers`, `locations`, `categories`, `products`, `movements`, `dashboard`, `export`. Chaque page appelle directement `@/lib/api-client` (pas encore de `api.ts`/`hooks/` séparés par domaine — la cible complète de `CLAUDE.md` prévoit cette séparation, pas encore faite).

### Permissions

`src/lib/permissions.ts` (`PermissionService`) duplique côté client les règles de `backend/app/core/permissions.py`, uniquement pour l'UX (masquer des boutons/colonnes) — le backend reste la seule source de vérité, revérifie systématiquement les permissions.

---

## Limites connues (documentées en détail dans `docs/REFACTOR_LOG.md`)

- **Migrations Alembic no-op** : `alembic upgrade head` ne crée aucune table (les 3 migrations existantes ont un `upgrade()` vide ou commenté). Le schéma de production n'existe que grâce à `Base.metadata.create_all()` dans `main.py`. `create_all` n'a donc pas été retiré. **Toujours ouvert.**
- **Doublons de nom non gérés** sur `locations`/`categories` : contrairement à `suppliers`, aucune vérification applicative avant insertion — un nom dupliqué provoque un `IntegrityError` non intercepté (crash 500) au lieu d'un 400 propre. **Toujours ouvert.**
- **Modèles SQLAlchemy non éclatés par domaine** : `app/models/models.py` reste un fichier unique partagé, référencé par tous les modules. Un éclatement complet nécessiterait de toucher ~15 fichiers d'un coup ; reporté. **Toujours ouvert.**
- **Code mort non supprimé** (décisions utilisateur explicites, à revisiter) :
  - Backend : `alert_service.py`, `dashboard_service.py` — jamais branchés, prévus pour un `feat` futur (`modules/alerts/`, `modules/dashboard/`).
  - Frontend : `src/components/{Navigation,ProtectedActions,RoleGuard,RoleProtectedPage}.tsx`, `src/lib/{navigation,rbac}.ts` — système RBAC alternatif jamais branché (788 lignes), `PermissionService` (`lib/permissions.ts`) fait foi.

**Corrigés depuis** (sur la branche `refactor/complete`, après la clôture des phases 0–5) :
- ~~`Settings` plantait sur une clé `.env` non déclarée~~ : corrigé (`extra="ignore"` + `TEST_DATABASE_URL`/`ALERT_CHECK_INTERVAL_HOURS`/`EXPIRY_ALERT_DAYS_BEFORE` déclarés explicitement dans `Settings`).
- ~~Deux `package-lock.json` faisaient inférer la mauvaise racine de workspace~~ : corrigé (`frontend/package-lock.json` supprimé, `turbopack.root` fixé explicitement dans `next.config.ts`).
