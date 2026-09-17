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

---

## Phase 3 — Backend, module `suppliers` (`refactor/suppliers`)

**Date** : 2026-09-17

**Fait** :
1. Tests d'intégration figeant le comportement actuel (`backend/tests/integration/test_suppliers.py`, 15 tests) écrits **avant** tout découpage, commit séparé. Deux erreurs corrigées dans les tests eux-mêmes avant le premier commit vert (pas dans le code applicatif) : le helper `make_user` local ne fixait pas `status=UserStatus.active` (les nouveaux utilisateurs recevaient le défaut `pending`, provoquant un faux 403) ; une faute de frappe dans le message attendu (« les » vs « des fournisseurs »). Une fois ces deux erreurs de test corrigées, 15/15 passent sur le code non refactoré.
2. Découpage : `app/modules/suppliers/{schemas,repository,service,router}.py`, suivant le même schéma que `users` (repository = accès DB pur, service lève les exceptions métier de `app/core/exceptions.py`, router inchangé au niveau des permissions/status codes).
3. `HTTPException` → exceptions métier : `NotFoundError` (404 — fournisseur introuvable), `ValidationAppError` (400 — nom dupliqué à la création et à la modification, suppression bloquée si le fournisseur a des produits liés, message dynamique avec le nombre de produits préservé à l'identique).
4. `app/routers/suppliers.py`, `app/services/supplier_service.py` supprimés. `app/schemas/schemas.py` : section Supplier retirée, mais `SupplierResponse` ré-importée depuis `app.modules.suppliers.schemas` car `ProductResponse` (pas encore refactoré) l'imbrique toujours — nécessaire tant que `products` n'est pas traité.
5. `main.py` mis à jour vers `app.modules.suppliers.router`.

**Vérifications** :
- `pytest -q` : 53 passed (38 précédents + 15 nouveaux), aucun test modifié pour passer.
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline (le module `suppliers` n'avait et n'a aucune erreur mypy).
- `ruff check .` (repo entier) : 224 (vs 230 après le module `users`/`auth`). Un `SIM102` (if imbriqués) relevé dans `service.py` : c'est la même occurrence unique déjà comptée dans l'audit initial (`update_supplier`), simplement déplacée — laissée telle quelle par cohérence avec le traitement des autres motifs pré-existants (`B008`, `BLE001`) dans ce refactor.
- `npm run lint`/`build` : sans objet, frontend non touché.

**Problème** : aucun côté application. Les deux erreurs listées ci-dessus étaient dans mes propres tests, corrigées avant le premier commit.

**Domaines métier** : ligne `suppliers` mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Phase 3 — Backend, module `locations` (`refactor/locations`)

**Date** : 2026-09-17

**BUG DÉCOUVERT — création/renommage en doublon crashe (500 non géré)** :

Contrairement à `suppliers`, le router `locations` d'origine (`app/routers/locations.py`) ne fait **aucune vérification applicative** de nom dupliqué avant `db.add()`/`db.commit()`, ni en création ni en modification. Or `Location.name` porte une contrainte `UNIQUE` en base (`app/models/models.py`). Résultat vérifié empiriquement (test écrit puis retiré, voir commit `3235094`) : POST `/locations/` avec un nom déjà utilisé lève une `sqlalchemy.exc.IntegrityError` **non interceptée**, qui remonte telle quelle — un 500 non contrôlé côté client au lieu d'un 400 propre comme pour `/suppliers`. Le même problème existe très probablement sur PATCH (renommage vers un nom déjà pris), non testé explicitement mais même mécanisme.

**Non corrigé**, conformément à la règle « bug découvert : noter sans corriger ». Le découpage reproduit ce comportement à l'identique (aucune vérification de doublon ajoutée dans `modules/locations/service.py`) : corriger ceci serait un changement de comportement (nouveau code de retour 400 à la place d'un crash), à traiter par une décision explicite si souhaité.

**Autre écart avec `suppliers`** (comportement existant, non un bug en soi) : `delete_location` ne vérifie pas si la localisation a des produits liés (contrairement à `delete_supplier`). Comme `Product.location_id` n'a pas de contrainte `ON DELETE` explicite, la suppression d'une localisation encore référencée par des produits dépend du comportement par défaut de PostgreSQL sur la FK — non testé ici (pas d'assertion écrite), comportement à vérifier si le sujet revient.

**Fait** :
1. Tests d'intégration (`backend/tests/integration/test_locations.py`, 12 tests) écrits et validés sur le code non refactoré. Le test initialement prévu pour « doublon autorisé » a révélé le bug ci-dessus ; remplacé par un commentaire documentant le crash plutôt que par une assertion (asserter un crash comme comportement « attendu » n'aurait pas de sens). Un test vérifie explicitement que la suppression est réservée aux admins malgré le commentaire trompeur du router (« Techniciens et admins ») — `PermissionChecker.can_delete_location` ne vérifie en réalité que `role == admin`.
2. Découpage : `app/modules/locations/{schemas,repository,service,router}.py`, même schéma que `suppliers`/`users`. `update_location` conserve exactement la logique originale (`if data.field is not None: ...`), différente du `model_dump(exclude_unset=True)` utilisé pour `suppliers`/`users` — pattern d'origine préservé sans uniformisation, pour ne rien changer au comportement (envoyer explicitement `null` sur un champ ne l'efface pas, contrairement à `suppliers`).
3. `HTTPException` → `NotFoundError` (404 — localisation non trouvée, seul cas d'erreur métier existant dans ce module).
4. `app/routers/locations.py` supprimé. `app/schemas/schemas.py` : section Location retirée ; `LocationResponse` ré-importée depuis le nouveau module (nécessaire pour `ProductResponse`, toujours pas refactoré). `main.py` mis à jour.

**Vérifications** :
- `pytest -q` : 65 passed (53 précédents + 12 nouveaux).
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline (`locations` n'avait et n'a toujours aucune erreur mypy).
- `ruff check .` : 222 (vs 224 après `suppliers`).
- `npm run lint`/`build` : sans objet.

**Domaines métier** : ligne `locations` mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Phase 3 — Backend, module `categories` (`refactor/categories`)

**Date** : 2026-09-17

Domaine quasi identique à `locations` (mêmes constats, même traitement) :

**Fait** :
1. Tests d'intégration (`backend/tests/integration/test_categories.py`, 11 tests) écrits et verts du premier coup sur le code non refactoré.
2. Découpage : `app/modules/categories/{schemas,repository,service,router}.py`. `update_category` garde la logique `if data.field is not None: ...` d'origine (pas `exclude_unset`).
3. `HTTPException` → `NotFoundError` (404). `app/routers/categories.py` supprimé, `app/schemas/schemas.py` section Category retirée (`CategoryResponse` ré-importée pour `ProductResponse`), `main.py` mis à jour.

**Même bug pré-existant que `locations`, non re-testé** : `Category.name` a aussi une contrainte `UNIQUE` en base sans vérification applicative correspondante dans le router/service d'origine — même risque de crash (`IntegrityError` non gérée) sur doublon, documenté par commentaire dans le fichier de test plutôt que par une assertion sur un crash. Non corrigé.

**Vérifications** :
- `pytest -q` : 76 passed (65 précédents + 11 nouveaux).
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline. Vérifié : les 3 erreurs qui étaient dans `app/routers/categories.py` se retrouvent à l'identique dans `app/modules/categories/service.py` (mêmes lignes `category.field = data.field`, simplement déplacées avec le code qu'elles concernent).
- `ruff check .` : 219 (vs 222 après `locations`).
- `npm run lint`/`build` : sans objet.

**Domaines métier** : ligne `categories` mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Phase 3 — Backend, module `products` (`refactor/products`)

**Date** : 2026-09-17

Domaine plus complexe que les précédents (sous-ressource `lots`, synchronisation de stock, validation de FK croisées vers `suppliers`/`locations`/`categories`).

**Fait** :
1. Tests d'intégration (`backend/tests/integration/test_products.py`, 29 tests) écrits avant tout découpage. Une erreur de données dans mon propre test corrigée avant le premier commit vert : « Methanol » contient la sous-chaîne « eth » (m-**eth**-anol), faussant un test de recherche censé ne matcher que « Ethanol » — remplacé par des noms sans chevauchement.
2. Découpage : `app/modules/products/{schemas,repository,service,router}.py`. Point notable : `service.py` réutilise les `repository` de `suppliers`, `locations` et `categories` (déjà refactorés) pour les vérifications d'existence de FK à la création d'un produit, plutôt que d'interroger `Supplier`/`Location`/`Category` directement — cohérent avec la dépendance FK `products → suppliers/locations/categories` identifiée dans l'audit.
3. La chorégraphie exacte `flush`/`refresh`/`commit` autour de `_sync_stock()` (recalcul de `current_stock` à partir des lots après chaque création/modification/suppression de lot) a été préservée à l'identique, via de petites méthodes `repository.refresh()`/`repository.commit()` dédiées plutôt qu'un accès direct à `db` depuis `service.py`.
4. `HTTPException` → exceptions métier : `NotFoundError` (404 — produit/lot introuvable, fournisseur/emplacement/catégorie introuvable), `ConflictError` (409 — référence produit dupliquée à la création et à la modification ; **seul module où 409 est le code d'origine**, contrairement aux doublons 400 de `suppliers`). `update_lot`/`delete_lot` gardent leur dépendance FastAPI `require_technician_or_admin` telle quelle (message 403 différent des autres routes de ce router, qui utilisent `PermissionChecker`/`PermissionDenied`) — comportement figé et testé explicitement.
5. `app/routers/products.py`, `app/services/product_service.py` supprimés. `app/schemas/schemas.py` : toute la section Product(Lot) retirée (plus besoin de ré-import, aucun autre domaine non refactoré ne nest ces schémas). `main.py` mis à jour. `ProductSummary` (déjà mort avant ce refactor, jamais utilisé) déplacée telle quelle dans le nouveau `schemas.py`, non supprimée — suppression hors périmètre de ce module.

**Vérifications** :
- `pytest -q` : 105 passed (76 précédents + 29 nouveaux), aucun test modifié.
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline (les 4 erreurs de `app/services/product_service.py` se retrouvent à l'identique dans `app/modules/products/service.py`).
- `ruff check .` : 202 (vs 219 après `categories`). Un `SIM102` relevé dans `update_product` : reproduction fidèle d'un if imbriqué déjà présent dans le fichier d'origine, non modifié.
- `npm run lint`/`build` : sans objet.

**Domaines métier** : ligne `products` mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Phase 3 — Backend, module `stock` / movements (`refactor/movements`)

**Date** : 2026-09-17

**Décision d'architecture — logique d'alertes gardée dans `movements`, pas extraite vers `alerts`** : `movement_service.py` d'origine écrit directement dans la table `alerts` (création/résolution automatique selon le niveau de stock et les dates de péremption, fonctions privées `_check_and_create_alerts`/`_upsert_alert`/`_resolve_alert`). Le domaine `alerts` n'a pas encore de router ni de module (cf. décision de la phase 0 : ce sera un `feat` séparé, après `export`). Extraire cette logique vers un futur `modules/alerts/` maintenant aurait changé le découpage sans raison liée à `movements` et risqué le comportement. Décision : ces fonctions restent dans `app/modules/movements/service.py`, et les requêtes sur `Alert` sont ajoutées à `app/modules/movements/repository.py` (`get_active_alert`, `add_alert`, `resolve_active_alerts`) plutôt que directement en ligne dans le service — cohérent avec le reste du module, mais concerne un modèle qui n'appartient pas au domaine `movements`. À reconsidérer quand `alerts` deviendra un module à part entière.

**Fait** :
1. Tests d'intégration (`backend/tests/integration/test_movements.py`, 16 tests) écrits et verts du premier coup sur le code non refactoré, y compris l'effet de bord sur `Alert` (création à la rupture de stock, résolution au réapprovisionnement), vérifié directement en base (pas d'endpoint `/alerts` pour l'instant).
2. Découpage : `app/modules/movements/{schemas,repository,service,router}.py`. `service.py` réutilise `app.modules.products.repository` (`get_by_id`, `get_lot_by_id`) pour valider l'existence du produit et l'appartenance du lot — cohérent avec la dépendance `movements → products` de l'audit.
3. `HTTPException` → exceptions métier : `NotFoundError` (404 — produit/lot/mouvement/produit ou lot associé introuvables) et `ValidationAppError` (400 — stock insuffisant sur une sortie, message dynamique avec quantités disponible/demandée préservé à l'identique).
4. La chorégraphie exacte d'origine (mise à jour en mémoire du stock du lot et du produit *avant* le commit, un seul commit, puis `_check_and_create_alerts` qui fait son propre `refresh`/commits) a été préservée sans simplification.
5. `app/routers/movements.py`, `app/services/movement_service.py` supprimés. `app/schemas/schemas.py` : section StockMovement retirée (import `MovementType` devenu inutile, retiré). `main.py` mis à jour.

**Vérifications** :
- `pytest -q` : 121 passed (105 précédents + 16 nouveaux).
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline (les 9 erreurs de `app/services/movement_service.py` se retrouvent à l'identique dans `app/modules/movements/service.py`).
- `ruff check .` : 190 (vs 202 après `products`). Erreurs restantes dans les nouveaux fichiers : uniquement des motifs pré-existants reproduits à l'identique (`DTZ005`/`DTZ011` sur `datetime.now()`/`date.today()`, déjà comptés dans l'audit initial ; `B008` habituel).
- `npm run lint`/`build` : sans objet.

**Domaines métier** : ligne `stock` (movements) mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Phase 3 — Backend, module `export` (`refactor/export`)

**Date** : 2026-09-17

Dernier domaine backend de la phase 3. Agrégateur transversal (lit dans `products`, `movements`, `alerts`, `users`, `suppliers`, `locations`, `categories`), traité en dernier comme prévu dans l'ordre de l'audit.

**Fait** :
1. Tests d'intégration (`backend/tests/integration/test_export.py`, 11 tests) écrits et verts du premier coup : permission admin-only (message identique sur les 9 routes), export ZIP (`/csv/all`), en-têtes + une ligne de données pour chacun des 8 CSV individuels (colonnes et ordre gelés).
2. Découpage : `app/modules/export/{repository,service,router}.py`. Pas de `schemas.py` (aucun schéma Pydantic dans ce domaine — réponses `Response`/`StreamingResponse` brutes).
3. `CSVExportService` (classe à méthodes statiques) convertie en fonctions de module dans `service.py`, pour rester cohérent avec le style des autres modules refactorés — formatage CSV strictement identique, vérifié par les tests.
4. `repository.py` : requêtes **non paginées** (`db.query(Model).all()`), volontairement **sans réutiliser** les fonctions `list_*` déjà paginées de `suppliers`/`locations`/`categories` (qui ont `limit=100` par défaut) — les réutiliser aurait tronqué silencieusement les exports au-delà de 100 lignes. Documenté en commentaire dans le fichier.
5. `router.py` : le pattern `try/except Exception as e: raise HTTPException(500, ...)` de chaque route est conservé tel quel (pas remplacé par une exception métier — ce n'est pas une règle métier unique mais un filet de sécurité générique attrapant tout, hors du cas d'usage prévu pour `AppError`).
6. Petit nettoyage sans impact : la variable locale `name_without_ext` dans `create_zip_export` (calculée mais jamais utilisée dans l'original) a été retirée.
7. `app/routers/export.py`, `app/services/csv_export_service.py` supprimés. `main.py` mis à jour.

**Constat** : `backend/app/routers/` ne contient plus que `__init__.py` — les 7 domaines backend prévus dans l'ordre de traitement sont tous découpés. `backend/app/services/` ne contient plus que `alert_service.py` et `dashboard_service.py` (code mort, non touché — cf. décision de la phase 0).

**Vérifications** :
- `pytest -q` : 132 passed (121 précédents + 11 nouveaux).
- `mypy app` : 83 erreurs, 11 fichiers — identique à la baseline (`export` n'avait et n'a toujours aucune erreur mypy).
- `ruff check .` : 175 (vs 190 après `movements`).
- `npm run lint`/`build` : sans objet.

**Domaines métier** : ligne `export` mise à jour dans CLAUDE.md → « backend terminé, frontend à refactorer ».

---

## Bilan phase 3 backend (users/auth → export)

Les 7 domaines backend de l'ordre de traitement sont refactorés (`auth`, `users`, `suppliers`, `locations`, `categories`, `products`, `stock`/movements, `export`) : structure `router → service → repository`, `HTTPException` remplacée par les exceptions métier de `app/core/exceptions.py` partout où c'était le cas d'origine, aucun changement de comportement (132 tests d'intégration figeant le comportement pré-refactor, tous verts après découpage, jamais modifiés). `mypy`/`ruff` stables ou en amélioration à chaque étape (aucune régression introduite).

Restent, hors périmètre de cette phase (décisions déjà actées, cf. entrées ci-dessus) :
- `alerts` et `dashboard` : code mort non branché, réservé à un `feat` séparé (décision utilisateur, phase 0).
- Bugs pré-existants découverts et documentés sans être corrigés : migrations Alembic no-op (`create_all` non retiré), `Settings` qui plante sur une clé `.env` non déclarée, doublons de nom non gérés sur `locations`/`categories` (crash 500 au lieu d'un 400 propre, contrairement à `suppliers`).
- Frontend (phase 4) : aucun fichier de `frontend/lab-manage/` touché à ce stade.

---

## Phase 4 — Frontend (`refactor/frontend`)

**Date** : 2026-09-17

**Blocage npm/Node résolu** : `npm`/Node ≥ 20 étaient absents de l'environnement d'exécution depuis la phase 1 (seul `node` v12.22.9 via apt). Installé localement (sans `sudo`) : Node 22.14.0 LTS téléchargé depuis nodejs.org et extrait dans `~/.local` (binaire, hors du dépôt). `npm install` a fait dériver `package-lock.json` (mises à jour mineures de dépendances transitives) — reverté, puis `npm ci` utilisé à la place pour installer exactement les versions verrouillées sans modifier le lockfile.

**Baseline établie avant toute modification** :
- `npm run build` : passe (Next.js 16.2.3, Turbopack), avertissement pré-existant sur la présence de deux lockfiles (`frontend/package-lock.json` quasi vide + `frontend/lab-manage/package-lock.json`) faisant que Next.js infère la mauvaise racine de workspace — non corrigé (config `turbopack.root` à ajouter si besoin, hors périmètre de cette tâche).
- `npm run lint` : **13 erreurs, 29 avertissements** sur le code non modifié — donc `npm run lint` échoue déjà (code de sortie non-zéro) sur `main`, avant tout refactor. La plupart des erreurs viennent de la règle React 19 `react-hooks/set-state-in-effect` (`setState` synchrone dans un `useEffect`, dans `app/page.tsx`, `RoleProtectedPage.tsx`). Ces 13/29 sont la référence : zéro nouveau problème ne doit apparaître dans les fichiers touchés par ce refactor.

**BUG/CODE MORT DÉCOUVERT — tout un système RBAC alternatif jamais branché** :

En lisant `app/page.tsx` en entier (2467 lignes) avant extraction, constat que l'application réelle implémente sa propre navigation (`NAV`, `PAGE_META` en dur dans `page.tsx`) et son propre contrôle d'accès via `lib/permissions.ts` (`PermissionService`), **sans jamais utiliser** :
- `components/Navigation.tsx`, `ProtectedActions.tsx`, `RoleGuard.tsx`, `RoleProtectedPage.tsx`
- `lib/navigation.ts` (`NavigationService`)
- `lib/rbac.ts` (barrel qui réexporte les 5 fichiers ci-dessus — lui-même jamais importé)

788 lignes au total. Tous créés dans le commit `1c5cd76` (« RBAC + restrictions roles + nettoyage projet », 2026-04-19), avec deux commits de suivi sur `RoleGuard.tsx` et `lib/navigation.ts`. Contrairement à `alert_service.py`/`dashboard_service.py` côté backend, rien n'indique un entretien récent ou une intention de branchement futur — plutôt une architecture RBAC alternative construite puis abandonnée au profit de l'implémentation plus simple directement dans `page.tsx`.

**Décision de l'utilisateur (2026-09-17)** : laisser ces 6 fichiers en l'état pour l'instant, ne pas les supprimer ni les brancher. Décision à revisiter en fin de refactor frontend.

**Fait** :
1. **Déplacement structurel vers `src/`** (mécanique, avant toute extraction de domaine) :
   - `app/` → `src/app/`, `components/` → `src/components/`, `lib/` → `src/lib/` (`git mv`, historique préservé).
   - `tsconfig.json` : `"@/*": ["./*"]` → `"@/*": ["./src/*"]`.
   - `public/`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `package.json` inchangés (restent à la racine, convention Next.js).
   - Vérifié : `npm run build` passe, `npm run lint` renvoie exactement 13 erreurs / 29 avertissements (identique à la baseline, zéro régression).

2. **`src/lib/api-client.ts`** créé (client `api.get/post/patch/del` + `API_BASE`, extraits verbatim). `page.tsx` importe désormais depuis là au lieu de définir `api`/`API_BASE` en ligne.
3. **Briques UI partagées extraites** : `src/lib/contexts.tsx` (`AuthContext`, `NotifContext`), `src/components/ui/icons.tsx`, `Modal.tsx`, `AccessDenied.tsx`.
4. **Les 8 domaines extraits un par un**, dans cet ordre (suppliers → categories → locations → users → movements → products → dashboard → export → auth), chacun avec son propre commit `refactor(frontend): extract <domaine> ...`, vérifié par `npm run build` + `npm run lint` après chaque extraction :
   - `src/features/suppliers/components/SuppliersPage.tsx`
   - `src/features/categories/components/CategoriesPage.tsx`
   - `src/features/locations/components/LocationsPage.tsx`
   - `src/features/users/components/UsersPage.tsx`
   - `src/features/movements/components/MovementsPage.tsx`
   - `src/features/products/components/ProductsPage.tsx` + `src/features/products/types.ts` (interfaces `Product`, `ProductLot`, `StockMovement`, `Supplier`, `Location`, `Category`, extraites du bloc `// ─── Type Definitions` de l'ancien `page.tsx` — `ProductLot`/`StockMovement` étaient déjà du code mort avant ce refactor, inutilisés dans l'original)
   - `src/features/dashboard/components/DashboardPage.tsx`
   - `src/features/export/components/ExportButton.tsx`
   - `src/features/auth/components/LoginPage.tsx`
5. **Shell final extrait** vers `src/components/shell/` : `styles.ts` (le CSS applicatif, renommé `APP_CSS`, injecté via `<style>` exactement comme avant — **pas** fusionné dans `globals.css`, pour ne prendre aucun risque avec l'ordre de cascade CSS), `NotifProvider.tsx`, `nav.ts` (`NAV`/`PAGE_META`), `AppShell.tsx`, `AppRoot.tsx` (ex-`App`, le composant racine avec auth/providers/polices). `src/app/page.tsx` réduit à une ligne : `export { default } from "@/components/shell/AppRoot";`.

**Discipline de vérification appliquée à chaque étape** : après chaque extraction, `npm run build` (doit passer) et `npm run lint` (le nombre exact d'erreurs/avertissements doit être expliqué, pas seulement égal). Plusieurs fois, une extraction a fait apparaître un import désormais inutilisé dans `page.tsx` (ex. `AccessDenied` après `users`, `PermissionService`/`Modal` après `dashboard`, `API_BASE` après `export`, `useContext` après `auth`) : à chaque fois, diagnostiqué précisément (diff du fichier concerné dans la sortie de lint, jamais un simple re-check du total) avant de committer. Le compte est ainsi passé de 42 problèmes (baseline) à 39 (13 erreurs, 26 avertissements) au fil du refactor, uniquement par nettoyage mécanique d'imports orphelins — jamais par simplification ou changement de comportement.

**Test en conditions réelles (au-delà de build/lint)** : aucun outil de navigateur (Chrome, navigateur intégré) n'était disponible dans cet environnement pour un test interactif complet. Vérifié à la place :
- Backend réel démarré (`uvicorn`, PostgreSQL neuf) + frontend réel démarré (`npm run dev`) pointés l'un sur l'autre via `NEXT_PUBLIC_API_BASE`.
- Rendu SSR de `/` inspecté via `curl` : affiche correctement l'état de chargement (`<div class="loading-bar">`) attendu avant que `AppRoot` ne sache si un token existe déjà.
- Payload RSC confirmé : `src/components/shell/AppRoot.tsx` est bien le composant résolu pour la route `/`.
- Bundle client inspecté : l'URL du backend de test (`127.0.0.1:8123`) est correctement inlinée dans le chunk contenant `api-client.ts`, confirmant que `NEXT_PUBLIC_API_BASE` est bien pris en compte.
- Aucune erreur de compilation ni d'exécution dans les logs du serveur de dev pendant la requête.
- Non vérifié faute d'outil : interactions réelles (clic, formulaire de login, rendu visuel des pages une fois authentifié). À faire manuellement par l'utilisateur avant mise en production, ou lors d'une session avec navigateur disponible.

**Vérification finale** : `npm run build` passe, `npm run lint` → 13 erreurs / 26 avertissements, tous tracés individuellement jusqu'à la baseline initiale (13 erreurs / 29 avertissements) — aucune régression, aucun problème non expliqué.

**À faire (hors périmètre de cette session)** :
- Revisiter la décision sur les 6 fichiers RBAC morts une fois le refactor frontend jugé stable.
- Introduire `api.ts`/`hooks/`/`types.ts` par domaine si l'équipe veut aller plus loin que le simple découpage en fichiers (actuellement chaque feature appelle encore `@/lib/api-client` directement depuis son composant, comme le faisait l'ancien code).
- `docs/ARCHITECTURE.md` (phase 5) reste à créer.
- Test interactif en navigateur réel à faire par l'utilisateur (aucun outil de navigateur disponible dans cette session).
