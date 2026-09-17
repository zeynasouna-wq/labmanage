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
| `auth` | `backend/app/routers/auth.py`, `backend/app/services/auth_service.py` | `frontend/lab-manage/app/page.tsx` (`LoginPage`) | à refactorer |
| `users` | `backend/app/routers/users.py`, `backend/app/services/user_service.py` | `frontend/lab-manage/app/page.tsx` (`UsersPage`), `lib/rbac.ts`, `lib/permissions.ts` | à refactorer |
| `suppliers` | `backend/app/routers/suppliers.py`, `backend/app/services/supplier_service.py` | `frontend/lab-manage/app/page.tsx` (`SuppliersPage`) | à refactorer |
| `locations` | `backend/app/routers/locations.py` (pas de service — SQL direct dans le router) | `frontend/lab-manage/app/page.tsx` (`LocationsPage`) | à refactorer |
| `categories` | `backend/app/routers/categories.py` (pas de service — SQL direct dans le router) | `frontend/lab-manage/app/page.tsx` (`CategoriesPage`) | à refactorer |
| `products` | `backend/app/routers/products.py`, `backend/app/services/product_service.py` | `frontend/lab-manage/app/page.tsx` (`ProductsPage`) | à refactorer |
| `stock` (movements) | `backend/app/routers/movements.py`, `backend/app/services/movement_service.py` | `frontend/lab-manage/app/page.tsx` (`MovementsPage`) | à refactorer |
| `export` | `backend/app/routers/export.py`, `backend/app/services/csv_export_service.py` | `frontend/lab-manage/app/page.tsx` (`ExportButton`) | à refactorer |
| `alerts` | `backend/app/services/alert_service.py` (jamais monté sur un router) | — | à trancher (voir `docs/REFACTOR_LOG.md`) |
| `dashboard` | `backend/app/services/dashboard_service.py` (jamais monté sur un router) | `frontend/lab-manage/app/page.tsx` (`DashboardPage`, calcul recalculé côté client) | à trancher (voir `docs/REFACTOR_LOG.md`) |

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

Tests dans `backend/tests/` :
- `unit/` : services avec repositories simulés (pas de base)
- `integration/` : endpoints via `TestClient` sur une base PostgreSQL de test

**État actuel** : aucun dossier `backend/tests/` n'existe et `pytest` ne collecte aucun test. Cette section décrit la cible mise en place lors de la phase « Fondations » du refactor.

Base de test :
- Base PostgreSQL dédiée, **jamais** la base de développement ni de production.
- URL fournie par la variable `TEST_DATABASE_URL` (déclarée dans `.env` et `.env.example`).
- **Important** : en local, `DATABASE_URL` pointe par défaut vers SQLite (`sqlite:///./labo_stock.db`) pour un démarrage rapide sans dépendance externe. `TEST_DATABASE_URL` doit **toujours** pointer vers PostgreSQL, jamais SQLite, pour éviter les divergences de comportement (types, contraintes, enums) entre les tests et la production (qui est PostgreSQL sur Render).
- Lancement local via Docker :
  ```bash
  docker run -d --name labmanage-test-db \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=labmanage_test -p 5433:5432 postgres:16
  ```
  puis `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/labmanage_test`
- Le schéma de test est créé via `alembic upgrade head` (pas `create_all`) dans une fixture de session.
- Chaque test s'exécute dans une transaction annulée à la fin : les tests sont indépendants et rejouables.

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
