# CLAUDE.md — LabManage (NGStock)

Application de gestion de laboratoire (stock, produits, etc.).
- `backend/` : API FastAPI (Python 3.12), PostgreSQL, SQLAlchemy, Alembic
- `frontend/lab-manage/` : Next.js (TypeScript), déployé sur Vercel

Suivi du refactor en cours : voir `docs/REFACTOR_LOG.md` (avancement, décisions, problèmes rencontrés).

**Langue** : réponds-moi en français. Code, commentaires, messages de commit et documentation technique en anglais. Noms de code (variables, fonctions, classes, exceptions) en anglais **cohérents** dans tout le projet.

---

## Domaines métier

Ordre de traitement recommandé (racine des dépendances FK en premier, agrégateurs en dernier) :

| Domaine | Backend | Frontend | État |
|---|---|---|---|
| `auth` | `backend/app/modules/auth/` (`router.py`, `schemas.py`, `service.py`) | `frontend/lab-manage/app/page.tsx` (`LoginPage`) | backend terminé, frontend à refactorer |
| `users` | `backend/app/modules/users/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`UsersPage`), `lib/rbac.ts`, `lib/permissions.ts` | backend terminé, frontend à refactorer |
| `suppliers` | `backend/app/modules/suppliers/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`SuppliersPage`) | backend terminé, frontend à refactorer |
| `locations` | `backend/app/modules/locations/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`LocationsPage`) | backend terminé, frontend à refactorer |
| `categories` | `backend/app/modules/categories/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`CategoriesPage`) | backend terminé, frontend à refactorer |
| `products` | `backend/app/modules/products/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`ProductsPage`) | backend terminé, frontend à refactorer |
| `stock` (movements) | `backend/app/modules/movements/` (`router.py`, `schemas.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`MovementsPage`) | backend terminé, frontend à refactorer |
| `export` | `backend/app/modules/export/` (`router.py`, `service.py`, `repository.py`) | `frontend/lab-manage/app/page.tsx` (`ExportButton`) | backend terminé, frontend à refactorer |
| `alerts` | `backend/app/services/alert_service.py` (pas encore de router — à créer, cf. décision `docs/REFACTOR_LOG.md`) | — | à créer (feat, pas un refactor pur) |
| `dashboard` | `backend/app/services/dashboard_service.py` (pas encore de router — à créer, cf. décision `docs/REFACTOR_LOG.md`) | `frontend/lab-manage/app/page.tsx` (`DashboardPage`, calcul recalculé côté client, à remplacer par un appel API) | à créer (feat, pas un refactor pur) |

Mettre à jour la colonne « État » à la fin de chaque module (`à refactorer` → `en cours` → `terminé`).

---

## Règles générales

- **Ne jamais modifier du code sans plan validé** pour toute tâche touchant plus de 2 fichiers.
- **Un module métier à la fois.** Ne pas refactorer plusieurs domaines dans la même tâche.
- **Ne jamais changer le comportement fonctionnel** pendant un refactor : mêmes routes, mêmes réponses JSON, mêmes codes de statut, sauf demande explicite.
- Fichiers courts : viser < 300 lignes. Au-delà, découper.
- Pas de code mort, pas de `print` de debug, pas de fichiers commentés « au cas où ».
- Aucun secret dans le code : tout passe par les variables d'environnement (`.env`, jamais commité ; `.env.example` tenu à jour à chaque nouvelle variable).
- En cas de doute sur un comportement existant (bug ou fonctionnalité ?), **demander** plutôt que corriger silencieusement.
- Après chaque étape : lancer lint + typecheck + tests, puis proposer un commit clair.

---

## Git

- Jamais de travail directement sur `main`.
- Une branche par module : `refactor/<domaine>` (ex. `refactor/stock`), `feat/<sujet>`, `fix/<sujet>`.
- Commits au format Conventional Commits, en anglais :
  - `refactor(stock): extract service layer`
  - `test(stock): add integration tests for current endpoints`
  - `feat(products): add barcode search`
- Petits commits : un commit par étape du workflow, pas un commit géant en fin de module.
- Ne jamais faire `git push --force`, `git reset --hard` ni supprimer de branche sans demande explicite.

---

## Backend — architecture

Structure par métier dans `backend/app/modules/<domaine>/` :

| Fichier | Responsabilité | Interdit |
|---|---|---|
| `router.py` | Routes HTTP, codes de statut, appel au service | Requêtes SQL, règles métier |
| `schemas.py` | Modèles Pydantic d'entrée/sortie | Logique, accès DB |
| `models.py` | Modèles SQLAlchemy (tables) | Logique HTTP |
| `service.py` | Règles métier, orchestration | `Request`, `HTTPException`, SQL brut |
| `repository.py` | Lecture/écriture en base | Règles métier |

Flux obligatoire : **router → service → repository → base**. Jamais de raccourci.

Transverse dans `backend/app/core/` :
- `config.py` : `Settings` via pydantic-settings (seule source de configuration)
- `database.py` : engine, session
- `security.py` : hash des mots de passe, JWT
- `exceptions.py` : exceptions métier (ex. `InsufficientStockError`, `ProductNotFoundError`) converties en réponses HTTP par un handler global

Conventions :
- Les services lèvent des **exceptions métier**, pas des `HTTPException`.
- Les routers ne retournent jamais un modèle SQLAlchemy directement : toujours un schéma Pydantic (`response_model`).
- Toute modification de table passe par une **migration Alembic**, jamais `create_all` en production.
- Un refactor pur ne doit générer **aucune** migration. Si `alembic revision --autogenerate` détecte des changements, s'arrêter et signaler.
- Typage complet (mypy doit passer).

Commandes (depuis `backend/`) :
```bash
ruff check . --fix && ruff format .
mypy app
pytest -q
uvicorn app.main:app --reload
```

Migrations Alembic (depuis `backend/`) :
```bash
alembic revision --autogenerate -m "short description"   # générer
alembic upgrade head                                     # appliquer
alembic downgrade -1                                     # annuler la dernière
alembic current                                          # état actuel
```
Toujours relire le fichier de migration généré avant de l'appliquer.

---

## Backend — tests

Mis en place lors de la phase « Fondations » (`refactor/core`, 2026-09-17). Tests dans `backend/tests/` :
- `unit/` : services avec repositories simulés (pas de base)
- `integration/` : endpoints via `TestClient` sur une base PostgreSQL de test
- Fichiers hors de ces deux dossiers (ex. `test_conftest_smoke.py`) : sanity checks de l'infra de test elle-même, pas d'un domaine métier.

Base de test :
- Base PostgreSQL dédiée, **jamais** la base de développement ni de production.
- URL fournie par la variable `TEST_DATABASE_URL`, déclarée dans **`backend/.env.test`** (fichier séparé, jamais commité) et documentée dans `backend/.env.example`.
- **Ne pas mettre `TEST_DATABASE_URL` dans `backend/.env`** : `Settings` (`app/core/config.py`) parse ce fichier sans `extra="ignore"`, donc toute clé qu'il ne déclare pas fait planter l'app au démarrage (bug pré-existant, voir `docs/REFACTOR_LOG.md` phase 2 — `ALERT_CHECK_INTERVAL_HOURS`/`EXPIRY_ALERT_DAYS_BEFORE` dans `.env.example` sont affectées par le même problème). `backend/tests/conftest.py` charge `.env.test` lui-même via `python-dotenv`, indépendamment de `Settings`.
- **Important** : en local, `DATABASE_URL` pointe par défaut vers SQLite (`sqlite:///./labo_stock.db`) pour un démarrage rapide sans dépendance externe. `TEST_DATABASE_URL` doit **toujours** pointer vers PostgreSQL, jamais SQLite, pour éviter les divergences de comportement (types, contraintes, enums) entre les tests et la production (qui est PostgreSQL sur Render).
- Lancement local via Docker :
  ```bash
  docker run -d --name labmanage-test-db \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=labmanage_test -p 5433:5432 postgres:16
  ```
  puis, dans `backend/.env.test` : `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/labmanage_test`
- **Écart temporaire avec la cible** : le schéma de test est créé via `Base.metadata.create_all()` (fixture `_test_schema`, session-scope) et non via `alembic upgrade head`, car les migrations actuelles ne créent réellement aucune table (bug pré-existant, voir `docs/REFACTOR_LOG.md` phase 2 — `Base.metadata.create_all` n'a donc pas pu être retiré de `main.py` non plus). Décision validée par l'utilisateur. À revenir sur `alembic upgrade head` une fois les migrations corrigées.
- Chaque test s'exécute dans une transaction annulée à la fin (connexion + `SAVEPOINT` relancé après chaque `commit()` applicatif) : les tests sont indépendants et rejouables.
- Le `client` de test (fixture `client`) instancie `TestClient(app)` **sans** bloc `with` : les événements `startup`/`shutdown` de `main.py` (dont la création automatique de l'admin) ne se déclenchent alors pas, ce qui évite de polluer la base de test hors transaction.

---

## Frontend — architecture

Racine du projet frontend : `frontend/lab-manage/` (pas de dossier `src/` pour le moment — c'est la cible du refactor).

**État actuel** : tout le métier (Dashboard, Products, Suppliers, Movements, Users, Categories, Locations) est défini comme des fonctions internes à `frontend/lab-manage/app/page.tsx` (~2500 lignes), chacune avec son propre appel `fetch`. Il n'y a ni `src/features/`, ni `src/components/ui/`, ni client HTTP unique.

Cible :
- `src/app/` : pages et layouts uniquement. Une page assemble des composants, elle ne contient ni `fetch` ni logique.
- `src/features/<domaine>/` : `components/`, `hooks/`, `api.ts` (appels API du domaine), `types.ts`
- `src/components/ui/` : composants génériques sans logique métier (Button, Modal, Table…)
- `src/lib/api-client.ts` : **unique** point d'appel HTTP (URL de base via `NEXT_PUBLIC_API_BASE`, gestion du token et des erreurs)

Conventions :
- TypeScript strict, pas de `any`.
- Les types API reflètent les schémas Pydantic du backend (mêmes noms de champs).
- Un composant = un fichier. Composants > 150 lignes → découper.
- Validation des formulaires côté client (zod ou équivalent), mais le backend reste la source de vérité.

Commandes (depuis `frontend/lab-manage/`) :
```bash
npm run lint
npm run build
npm run dev
```

---

## Workflow de refactor

1. Créer la branche `refactor/<domaine>`.
2. Lire le code existant du domaine concerné et le résumer avant toute modification (routes, réponses, règles métier, dépendances vers d'autres domaines).
3. Écrire des tests d'intégration qui figent le comportement actuel des endpoints. Ils doivent passer **avant** tout refactor. Commit.
4. Proposer le plan de découpage (fichiers créés/déplacés/supprimés) et **attendre la validation**.
5. Après validation : migrer, relancer lint + mypy + tests, corriger jusqu'au vert. Les tests de l'étape 3 ne doivent pas être modifiés pour passer.
6. Mettre à jour `docs/ARCHITECTURE.md` si la structure change (créer le fichier et le dossier `docs/` s'ils n'existent pas).
7. Mettre à jour le tableau « Domaines métier » ci-dessus, puis proposer le commit final.
