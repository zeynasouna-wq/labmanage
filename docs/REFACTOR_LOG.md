# Refactor Log — LabManage

Suivi du refactor global décrit dans `CLAUDE.md`. Mis à jour après chaque étape : ce qui est fait, les décisions prises, les problèmes rencontrés, ce qui reste.

---

## Phase 0 — Documentation (`docs/update-claude-md`)

**Date** : 2026-09-17

**Fait** :
- `CLAUDE.md` mis à jour avec les 10 domaines réels identifiés lors de l'audit (`auth`, `users`, `suppliers`, `locations`, `categories`, `products`, `stock`/movements, `export`, `alerts`, `dashboard`), dans l'ordre de traitement recommandé (racine des dépendances FK d'abord, agrégateurs en dernier).
- Chemin frontend corrigé partout : `frontend/lab-manage/` (pas `frontend/`).
- Section « Backend — tests » mise à jour : aucun `backend/tests/` n'existe actuellement, `pytest` ne collecte aucun test. Clarification ajoutée : `TEST_DATABASE_URL` doit toujours pointer vers PostgreSQL, même si `DATABASE_URL` local par défaut est SQLite.
- `NEXT_PUBLIC_API_BASE` conservé tel quel (pas de renommage en `NEXT_PUBLIC_API_URL`).

**Décision validée par l'utilisateur — `alert_service.py` / `dashboard_service.py`** :

Analyse git (point d'arrêt obligatoire) :
- `alert_service.py` : créé au commit `fe00687` (« first commit », 2026-04-16). Jamais retouché depuis, jamais importé par aucun router ni par `main.py`, à aucun moment de l'historique.
- `dashboard_service.py` : créé le même jour, puis **corrigé activement le lendemain** (`2782ac0`, 2026-04-17, « fix: severales uncoherences on backend »). Ce commit corrige un vrai bug de schéma : le code utilisait `Product.expiry_date`, qui n'existe pas — la date d'expiration est sur `ProductLot`. La correction rejoint proprement via les lots.
- Les schémas Pydantic associés (`DashboardStats`, `StockReport`, `AlertResponse`, `AlertAcknowledge`) existent déjà intégralement dans `schemas.py`.
- Aucun router `dashboard` ou `alerts` n'a jamais existé dans l'historique (vérifié sur tout le log, pas seulement la branche courante).
- Côté frontend, `DashboardPage` (dans `page.tsx`) ne fait aucun appel à `/dashboard` ou `/alerts` : il recalcule les mêmes statistiques côté client à partir de `products` et `movements` déjà chargés par ailleurs.

Conclusion transmise à l'utilisateur : travail backend **inachevé**, pas du code abandonné après suppression (le fix du 17/04 montre un effort actif de maintenance un jour après la création).

**Décision de l'utilisateur (2026-09-17)** : brancher ces services en créant les routers manquants (`alerts`, `dashboard`). C'est un **ajout fonctionnel** (nouvelles routes exposées côté API), donc **hors du cadre « refactor sans changement de comportement »** : ce travail sera fait en `feat(alerts)` / `feat(dashboard)`, séparément des commits `refactor(...)`, une fois la structure modulaire (`router → service → repository`) en place — pas de raccourci dans l'ancienne structure plate.

**Domaines ajoutés à l'ordre de traitement backend** : `alerts` et `dashboard` viennent après `export`, car ce sont des agrégateurs transversaux (comme `export`) qui dépendent de `products`, `movements` et `users` déjà refactorés.

---

## Phase 1 — Nettoyage (`chore/cleanup`)

**Date** : 2026-09-17

**Fait** :
- Suppression de `frontend/lab-manage/app/ExportComponent.tsx` (264 lignes), confirmé inutilisé : aucun import trouvé nulle part dans `frontend/lab-manage` (`grep -rn "ExportComponent"` ne trouve que sa propre définition). Dupliquait la fonction `ExportButton` déjà définie et utilisée dans `app/page.tsx`.

**Correction de l'audit initial — `database_url_fixed` NON supprimé** :
- L'audit de la phase précédente avait conclu à tort que `Settings.database_url_fixed` (`backend/app/core/config.py`) était mort, car la recherche n'avait couvert que `backend/app` et les scripts racine.
- En réalité, `backend/alembic/env.py:13` l'utilise : `config.set_main_option("sqlalchemy.url", settings.database_url_fixed)`. C'est la propriété qui fournit l'URL de connexion à Alembic pour toutes les migrations.
- **Non supprimé.** Le duplicata avec `db/session.py::get_database_url()` (même logique de correction `postgres://` → `postgresql://`) reste donc en l'état — les deux fonctions font la même chose pour deux consommateurs différents (SQLAlchemy runtime vs Alembic). Fusionner les deux serait un vrai refactor (pas juste une suppression de code mort) : à considérer plus tard, hors du périmètre de ce nettoyage.

**Vérifications** :
- `ruff check backend/.` : 318 erreurs (inchangé, aucun fichier backend modifié dans cette phase).
- `mypy backend/app` : 83 erreurs (inchangé).
- `pytest -q` (backend) : aucun test collecté (inchangé, attendu — la base de test arrive en phase 2).
- `npm run lint` / `npm run build` (frontend) : **impossible à exécuter dans cet environnement** — `npm` n'est pas installé (seul `node` v12.22.9 est présent via apt, sans npm, et incompatible avec Next.js 16.2.3 qui exige Node ≥ 20). Suppression d'un fichier non importé nulle part et donc sans effet de compilation attendu, mais **non vérifié par un build réel**. À relancer manuellement ou sur CI avant de considérer cette phase totalement validée.

**Problème** : outillage `npm`/Node absent de cet environnement d'exécution — bloque la vérification `npm run lint`/`npm run build` requise après chaque étape touchant le frontend (phase 4 en particulier). Signalé à l'utilisateur.

---

## Phase 2 — Fondations (`refactor/core`)

**Date** : 2026-09-17

**Base de test** : conteneur Docker `labmanage-test-db` (postgres:16, port 5433) créé conformément à `CLAUDE.md`. `TEST_DATABASE_URL` ajouté à `backend/.env.example` (validé par l'utilisateur, cf. point d'arrêt « changement de variable d'environnement »).

**BUG CRITIQUE DÉCOUVERT — migrations Alembic no-op, `create_all` NON retiré** :

Point d'arrêt obligatoire exécuté : `alembic upgrade head` sur une base PostgreSQL vide, puis `alembic revision --autogenerate`.

- `alembic upgrade head` passe sans erreur et stamp `alembic_version` sur le head (`cascade_delete_user_relations`).
- Mais après cette commande, la base ne contient **qu'une seule table : `alembic_version`**. Aucune des 9 tables du modèle n'existe.
- `alembic revision --autogenerate` le confirme : il détecte les 9 tables (`categories`, `locations`, `suppliers`, `users`, `products`, `alerts`, `product_lots`, `stock_movements`) + tous leurs index comme « ajoutées ».

**Cause** : les 3 migrations existantes ne font rien :
- `alembic/versions/818f2efe08d8_initial.py` : `upgrade()` = `pass` (jamais rempli après génération auto).
- `alembic/versions/817356a89c73_sync_prod_schema.py` : `pass`, commentaire *"No schema changes needed - the models already reflect the current structure"*.
- `alembic/versions/cascade_delete_user_relations.py` : le DDL réel (`ADD CASCADE`/`SET NULL` sur les FK `stock_movements.user_id` et `alerts.acknowledged_by_id`) est écrit **en commentaire**, jamais exécuté (note : *"When migrating to PostgreSQL, uncomment the code below"*).

**Impact** : en production, le schéma n'existe que grâce à `Base.metadata.create_all(bind=engine)` dans `main.py` au démarrage. Alembic ne gère rien de réel actuellement, malgré les 3 fichiers de migration présents. Sur toute base fraîche, retirer `create_all` sans corriger les migrations d'abord laisserait l'application démarrer sans aucune table.

**Effet secondaire probable** : les contraintes `ondelete="CASCADE"` (sur `stock_movements.user_id`) et `ondelete="SET NULL"` (sur `alerts.acknowledged_by_id`) déclarées dans `models.py` ne sont vraisemblablement **pas appliquées au niveau de la base PostgreSQL de production**, puisque la migration censée les poser est un no-op. Seul SQLAlchemy au niveau ORM applique un comportement de cascade (`cascade="all, delete-orphan"` / `cascade="all, delete"` côté `relationship()`), ce qui n'est pas équivalent à une contrainte DB réelle (ne protège pas contre des suppressions SQL directes).

**Décision** : `Base.metadata.create_all` **n'est pas retiré**. Reporté à l'utilisateur, non corrigé (conformément à la règle « tout bug découvert : noter sans corriger »). Réécrire les migrations pour qu'elles reflètent réellement le schéma actuel est un chantier à part, plus risqué qu'un refactor pur — à traiter séparément si demandé explicitement.

**BUG DÉCOUVERT — `Settings` plante si `.env` contient une clé non déclarée** :

En créant `backend/.env` (copie de `.env.example`, geste documenté par le fichier lui-même : « Copy this file to .env and fill in the values »), `Settings()` a levé une `ValidationError` pydantic (`extra_forbidden`) sur 3 clés : `TEST_DATABASE_URL`, `ALERT_CHECK_INTERVAL_HOURS`, `EXPIRY_ALERT_DAYS_BEFORE`. Ces deux dernières étaient déjà présentes dans `.env.example` **avant** toute modification de cette session (cf. audit initial). `app/core/config.py` utilise `class Config: env_file = ".env"` (style pydantic v1) sans `extra="ignore"` ; pydantic-settings v2 valide donc tout le contenu du fichier `.env` contre les champs déclarés de `Settings` et rejette les clés inconnues. Vérifié : une variable d'environnement OS du même nom (hors fichier `.env`) ne déclenche pas ce problème — seul le contenu du fichier `.env` est concerné.

**Impact réel** : un nouveau développeur qui suit littéralement l'en-tête de `.env.example` (« Copy this file to .env ») fait planter l'application au démarrage. Bug pré-existant, non introduit par cette session. **Non corrigé** (conformément à la règle « bug découvert : noter sans corriger ») — corriger `Settings` (ajouter `extra="ignore"` ou déclarer les champs manquants) est un changement de comportement du chargement de config, à traiter explicitement, pas en passant.

**Contournement pour l'infra de test** (n'affecte aucun fichier applicatif) :
- `backend/.env` (local, non commité) : `TEST_DATABASE_URL` retiré, `ALERT_CHECK_INTERVAL_HOURS`/`EXPIRY_ALERT_DAYS_BEFORE` commentés.
- `backend/.env.test` (nouveau, non commité, ajouté à `.gitignore`) : contient uniquement `TEST_DATABASE_URL`, chargé exclusivement par `tests/conftest.py` via `python-dotenv`, jamais par `Settings`.
- `backend/.env.example` et `CLAUDE.md` mis à jour pour documenter cette séparation.

**Fait** :
- `backend/.gitignore` : ajout de `.env`, `.env.test`, `.pytest_cache/` (l'ancien `.gitignore` n'excluait que `env/`, un dossier — jamais de fichier `.env` réel committé jusqu'ici, mais aucun garde-fou explicite n'existait).
- `backend/tests/conftest.py` : fixtures `_test_schema` (crée le schéma via `Base.metadata.create_all`, cf. décision ci-dessus), `db_session` (connexion + transaction externe + SAVEPOINT relancé après chaque `commit()` applicatif, rollback complet en fin de test), `client` (`TestClient(app)` sans bloc `with`, pour ne pas déclencher le `startup` de `main.py` qui crée un admin hors transaction).
- `backend/pytest.ini` : `testpaths = tests`.
- `backend/tests/test_conftest_smoke.py` : 3 tests de sanity sur l'infra elle-même (endpoint `/health`, isolation transactionnelle entre deux tests). Tous verts.
- `backend/app/core/exceptions.py` : classe de base `AppError` (status_code, detail, headers optionnels) + 5 exceptions génériques (`NotFoundError`, `ConflictError`, `ValidationAppError`, `PermissionDeniedError`, `UnauthorizedError`). Les exceptions spécifiques à un domaine (ex. `ProductNotFoundError`, `InsufficientStockError` citées en exemple dans CLAUDE.md) seront ajoutées module par module en phase 3, pas ici.
- `backend/main.py` : handler global `app_error_handler` enregistré via `@app.exception_handler(AppError)`, qui réplique **exactement** `fastapi.exception_handlers.http_exception_handler` (même gestion de `is_body_allowed_for_status_code`, même corps `{"detail": ...}`, mêmes headers). Vérifié par test unitaire que le corps JSON produit est byte-identique à celui d'un `HTTPException` équivalent. Import réordonné par `ruff --fix`/`ruff format` (mécanique, aucun changement de comportement).
- `backend/tests/unit/test_exceptions.py` : 6 tests unitaires sur `AppError` et le handler (defaults, override, headers, égalité byte-à-byte avec le handler FastAPI par défaut). Tous verts.
- Aucun service existant n'a été modifié : ils continuent de lever `HTTPException` directement. Le remplacement par les exceptions métier se fait domaine par domaine en phase 3 (CLAUDE.md, "Backend — architecture").

**Vérifications** :
- `pytest -q` (backend) : 9 passed (3 smoke + 6 exceptions).
- `mypy app` : 83 erreurs, 11 fichiers — **identique à la baseline**, zéro régression introduite par `core/exceptions.py`.
- `ruff check` (fichiers touchés/créés : `app/core/exceptions.py`, `main.py`, `tests/`) : 1 erreur restante, `BLE001` sur le `except Exception` pré-existant du `startup` de `main.py` (déjà présent dans la baseline de 318 erreurs, logique non touchée, hors périmètre de cette phase).
- `ruff check .` (repo entier) : 317 erreurs (vs 318 en baseline — legère baisse due au nettoyage mécanique des imports de `main.py`), aucune régression.
- `npm run lint` / `npm run build` : toujours impossible dans cet environnement (`npm` absent), sans changement depuis la phase 1. Frontend non touché dans cette phase.

**À faire** : rien de bloquant pour la suite ; les deux bugs découverts (migrations Alembic no-op, `Settings` qui rejette les clés `.env` inconnues) restent ouverts et non corrigés, à traiter par décision explicite de l'utilisateur si souhaité.

---

## Phase 3 — Backend, module `users` / `auth` (`refactor/users-auth`)

**Date** : 2026-09-17

**Décision d'architecture — modèles SQLAlchemy non déplacés** : `User`, `UserRole`, `UserStatus` restent dans `app/models/models.py` partagé, au lieu d'un `app/modules/users/models.py` comme le prescrit littéralement CLAUDE.md. Raison : `User` est référencé par `StockMovement`, `Alert`, et importé dans ~15 fichiers d'autres domaines pas encore refactorés (`movement_service.py`, `product_service.py`, tous les routers non traités, `core/dependencies.py`, `core/permissions.py`, etc.). Le déplacer maintenant aurait forcé à toucher tous ces fichiers hors du domaine `users`/`auth`, à l'encontre de la règle « un module métier à la fois ». Décision : garder `app/models/models.py` comme source unique jusqu'à ce que chaque domaine consommateur soit lui-même refactoré ; envisager un déplacement groupé des modèles en toute fin de refactor, ou choisir de garder un `models.py` partagé de façon permanente — à trancher avec l'utilisateur plus tard si souhaité. Idem pour `auth` : pas de `models.py`/`repository.py` propres (aucune table possédée ; `auth/service.py` réutilise `modules/users/repository.py` pour ses deux lectures, cohérent avec la dépendance FK `auth → users` identifiée dans l'audit).

**Fait** :
1. Tests d'intégration figeant le comportement actuel (`backend/tests/integration/test_auth_users.py`, 29 tests) écrits et validés **avant** tout découpage — commit séparé (`aac5279`), tous verts sur le code non refactoré.
2. Découpage effectué :
   - `app/modules/auth/{schemas,service,router}.py` : `LoginRequest`/`TokenResponse`/`RefreshTokenRequest`, `authenticate_user`/`refresh_access_token`, routes `/auth/login`, `/auth/refresh`, `/auth/me`.
   - `app/modules/users/{schemas,repository,service,router}.py` : `UserCreate`/`UserUpdate`/`UserPasswordChange`/`UserResponse`, logique métier + accès DB séparés, routes `/users/*`.
   - `app/routers/auth.py`, `app/routers/users.py`, `app/services/auth_service.py`, `app/services/user_service.py` supprimés (remplacés).
   - `app/schemas/schemas.py` : sections Auth/User retirées ; import `EmailStr` retiré (devenu inutile par cette suppression). `model_validator` reste un import inutilisé pré-existant, non touché (hors périmètre de ce module).
   - `main.py` : imports et `include_router` mis à jour vers `app.modules.auth.router`/`app.modules.users.router`.
3. `HTTPException` remplacée par les exceptions métier (`app/core/exceptions.py`, posées en phase 2) dans les deux nouveaux `service.py` : `ValidationAppError` (400 — email dupliqué, auto-suppression, auto-désactivation, mot de passe actuel incorrect), `NotFoundError` (404 — utilisateur introuvable), `UnauthorizedError` (401 — identifiants invalides, refresh token invalide/type incorrect, utilisateur invalide), `PermissionDeniedError` (403 — compte désactivé/en attente/suspendu). Chaque mapping vérifié pour préserver exactement le même status code que l'`HTTPException` d'origine (ex. email dupliqué reste 400, pas 409 malgré `ConflictError` disponible). `core/permissions.py` (`PermissionDenied`, utilisée au niveau des routers, pas des services) et `core/dependencies.py`/`core/security.py` (utilisés par tous les domaines) **non touchés** — hors périmètre de ce module.

**Vérifications** :
- `pytest -q` (backend) : 38 passed (9 fondations + 29 figeant `users`/`auth`), **sans modifier aucun des 29 tests d'intégration** écrits avant le refactor.
- `mypy app` : 83 erreurs, 11 fichiers — **identique à la baseline**. Vérifié fichier par fichier : `app/services/auth_service.py` (12 erreurs) → `app/modules/auth/service.py` (12, mêmes lignes) ; `app/services/user_service.py` (5) → `app/modules/users/service.py` (5). Aucune régression, aucune amélioration — erreurs de typage pré-existantes simplement déplacées.
- `ruff check .` (repo entier) : 230 erreurs (vs 317 en fin de phase 2) — baisse mécanique due à la suppression des 4 anciens fichiers et à `ruff --fix`/`ruff format` appliqués sur les nouveaux. Erreurs restantes dans les nouveaux fichiers : `B008` (`Depends(...)` en valeur par défaut — pattern FastAPI standard, utilisé partout ailleurs dans le codebase, pas une régression) et 1 `DTZ003` (`datetime.utcnow()`, ligne copiée à l'identique depuis l'ancien `auth_service.py`, comportement volontairement inchangé). `BLE001` pré-existant dans `main.py` (déjà noté en phase 2) inchangé.
- `npm run lint`/`npm run build` : sans objet, aucun fichier frontend touché dans ce module.

**Frontend** : non traité dans cette phase (réservé à la phase 4, `refactor/frontend`, un domaine à la fois). `LoginPage`/`UsersPage` restent dans `app/page.tsx` pour l'instant.

**Problème** : aucun.

**Domaines métier** : lignes `auth` et `users` mises à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».
