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

*(à venir)*
