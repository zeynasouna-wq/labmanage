# Guide de test manuel — LabManage (NGStock)

Ce guide t'accompagne pas à pas pour tester dans un vrai navigateur le résultat du refactor (backend `router → service → repository` + frontend `src/features/`), rassemblé sur la branche **`refactor/complete`**.

Il n'y a eu aucun test interactif en navigateur pendant le refactor (aucun outil de ce type n'était disponible dans l'environnement d'exécution) — c'est donc la première vérification visuelle réelle. Suis les étapes dans l'ordre.

---

## 0. Se placer sur la bonne branche

```bash
cd labmanage
git checkout refactor/complete
git status   # doit être propre
```

---

## 1. Prérequis

| Outil | Version | Vérifier avec |
|---|---|---|
| Python | 3.12 (le projet le cible ; 3.11+ fonctionne aussi) | `python3 --version` |
| Node.js | **≥ 20** (obligatoire — Next.js 16 ne démarre pas sous Node 18 ou moins) | `node --version` |
| npm | fourni avec Node ≥ 20 | `npm --version` |

Si `node --version` affiche moins que 20 (par ex. Node 12 ou 18 via `apt`), installe une version récente avant de continuer (ex. via [nodejs.org](https://nodejs.org), `nvm`, ou le gestionnaire de paquets de ton OS). Un `npm` complètement absent (`command not found`) est un signe que seul le paquet `nodejs` système est installé sans `npm` — il faut alors une installation Node complète.

Aucune base PostgreSQL n'est nécessaire pour ce test manuel : par défaut le backend utilise SQLite en local (`DATABASE_URL=sqlite:///./labo_stock.db`), largement suffisant pour vérifier l'UI.

---

## 2. Démarrer le backend

Dans un premier terminal :

```bash
cd backend
python3 -m venv .venv          # si pas déjà fait
source .venv/bin/activate
pip install -r requirements.txt
```

### 2.1 Créer `backend/.env`

```bash
cp .env.example .env
```

**⚠️ Piège connu (bug documenté dans `docs/REFACTOR_LOG.md`, phase 2)** : `Settings` (`app/core/config.py`) plante au démarrage si `.env` contient une clé qu'il ne déclare pas. **Trois lignes** de `.env.example` sont concernées — commente-les toutes les trois avant de lancer le serveur (`.env.example` les documente à titre de référence, mais elles ne doivent jamais rester actives dans `.env` lui-même) :

```bash
# Dans backend/.env, commente ces trois lignes (préfixe #) :
# TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/labmanage_test
# ALERT_CHECK_INTERVAL_HOURS=24
# EXPIRY_ALERT_DAYS_BEFORE=30
```

`TEST_DATABASE_URL` ne sert que pour `pytest`, pas pour ce test manuel — et sa vraie place, si tu en as besoin un jour, est `backend/.env.test`, jamais `backend/.env` (voir le commentaire dans `.env.example`).

Le reste du fichier peut rester tel quel : `DATABASE_URL` en SQLite, `FIRST_ADMIN_EMAIL=admin@labo.sn` / `FIRST_ADMIN_PASSWORD=Admin@2024!` (l'admin est créé automatiquement au premier démarrage), `CORS_ORIGINS` inclut déjà `http://localhost:3000`.

### 2.2 Lancer le serveur

```bash
uvicorn main:app --reload
```

Tu dois voir dans les logs :
```
==> Admin créé : admin@labo.sn
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Vérifie rapidement que l'API répond, dans un autre terminal :
```bash
curl http://localhost:8000/health
# {"status":"healthy","database":"connected"}
```

**Laisse ce terminal ouvert** (le serveur tourne en continu).

---

## 3. Démarrer le frontend

Dans un **deuxième terminal** :

```bash
cd frontend/lab-manage
npm ci
```

`npm ci` (plutôt que `npm install`) installe exactement les versions verrouillées dans `package-lock.json`, sans le modifier.

### 3.1 Configurer l'URL de l'API

```bash
echo 'NEXT_PUBLIC_API_BASE=http://localhost:8000' > .env.local
```

(`.env.local` est déjà ignoré par git, pas de risque de le committer par erreur.)

### 3.2 Lancer le serveur de dev

```bash
npm run dev
```

Tu dois voir :
```
▲ Next.js 16.2.3 (Turbopack)
- Local: http://localhost:3000
✓ Ready in ...ms
```

Un avertissement sur « plusieurs lockfiles détectés » peut apparaître (`frontend/package-lock.json` vs `frontend/lab-manage/package-lock.json`) — connu, sans impact, ignore-le.

---

## 4. Ouvrir dans le navigateur et se connecter

1. Va sur **http://localhost:3000**
2. Tu dois voir la page de connexion (fond sombre, carte centrée « NGStock »).
3. Connecte-toi avec :
   - Email : `admin@labo.sn`
   - Mot de passe : `Admin@2024!`
4. Tu dois arriver sur le tableau de bord, avec la barre latérale de navigation (Tableau de bord, Produits, Fournisseurs, Catégories, Localisations, Mouvements, Utilisateurs).

Si la connexion échoue ou reste bloquée :
- Ouvre les outils de développement du navigateur (F12) → onglet **Console** et **Réseau**.
- Une erreur CORS (`blocked by CORS policy`) → vérifie que `CORS_ORIGINS` dans `backend/.env` contient bien `http://localhost:3000`.
- Une erreur `Failed to fetch` / `ERR_CONNECTION_REFUSED` → vérifie que le backend tourne toujours sur le port 8000 et que `.env.local` du frontend pointe au bon endroit.

---

## 5. Checklist fonctionnelle — un domaine à la fois

Pour chaque domaine, l'objectif est de vérifier que **lister / créer / modifier / supprimer** fonctionnent et que les permissions par rôle (visibles dans la barre latérale et les boutons d'action) correspondent à ce qui est documenté dans `docs/ARCHITECTURE.md`.

### 5.1 Tableau de bord
- [ ] Les 4 cartes de statistiques s'affichent (Produits, Fournisseurs, Mouvements, Stock faible).
- [ ] Le tableau « Derniers mouvements » s'affiche (vide au début, normal).

### 5.2 Fournisseurs
- [ ] Créer un fournisseur (« Nouveau fournisseur ») avec un nom.
- [ ] Le fournisseur apparaît dans la liste.
- [ ] Le modifier (contact/téléphone), vérifier que ça se met à jour.
- [ ] **Essayer de créer un deuxième fournisseur avec le même nom** → doit afficher une erreur propre (« Un fournisseur avec ce nom existe déjà »), pas un écran blanc/crash.
- [ ] Le supprimer.

### 5.3 Catégories
- [ ] Créer une catégorie avec un nom et une couleur.
- [ ] La modifier, la supprimer.
- [ ] ⚠️ **Bug connu, non corrigé** (voir `docs/REFACTOR_LOG.md`) : créer deux catégories avec le **même nom** provoque une erreur serveur brute (500), pas un message propre. C'est un comportement pré-existant, pas une régression — pas besoin de le signaler si tu le rencontres en testant ce cas précis.

### 5.4 Localisations
- [ ] Même check que Catégories (créer/modifier/supprimer, coche « Contrôle de température »).
- [ ] Même bug connu sur les doublons de nom.

### 5.5 Produits
- [ ] Créer un produit avec un nom, une référence, et **au moins un lot** (numéro de lot + quantité) directement dans le formulaire de création.
- [ ] Vérifier que le stock total affiché correspond à la somme des quantités des lots.
- [ ] Ouvrir « Détails » sur un produit → vérifie que fournisseur/localisation/catégorie s'affichent si renseignés.
- [ ] Modifier un produit, ajouter/retirer un lot depuis l'écran d'édition.
- [ ] **Essayer de créer un produit avec une référence déjà utilisée** → doit afficher une erreur propre (409, référence dupliquée).
- [ ] Archiver un produit.

### 5.6 Mouvements
- [ ] Depuis « Mouvements » → « Nouveau mouvement » : chercher un produit existant, choisir un lot, faire une **entrée** de stock → vérifie que le stock du produit augmente (retourne sur Produits pour confirmer).
- [ ] Faire une **sortie** → vérifie que le stock diminue.
- [ ] **Essayer une sortie avec une quantité supérieure au stock disponible du lot** → doit afficher une erreur propre (« Stock insuffisant… »), pas planter.
- [ ] Depuis le formulaire, essayer « Ajouter un nouveau lot » directement pendant la création d'un mouvement d'entrée.
- [ ] Supprimer un mouvement → vérifie que le stock revient à sa valeur précédente.

### 5.7 Utilisateurs (visible seulement en tant qu'admin)
- [ ] Créer un utilisateur avec le rôle « Technicien » ou « Lecteur ».
- [ ] Se déconnecter, se reconnecter avec ce nouvel utilisateur → vérifier que la barre latérale affiche **moins d'options** selon son rôle (ex. un « Lecteur » ne doit pas voir « Utilisateurs », un non-admin ne peut pas créer de fournisseur).
- [ ] Reconnecte-toi en admin, désactive/réactive l'utilisateur créé, puis supprime-le.

### 5.8 Export (bouton en haut à droite, visible admin uniquement)
- [ ] Cliquer sur « Exporter » → menu déroulant avec les options (Tous les enregistrements, Produits, Mouvements, etc.).
- [ ] Télécharger « Produits » → un fichier `.csv` doit se télécharger, l'ouvrir et vérifier que les données créées plus haut y figurent.
- [ ] Télécharger « Tous les enregistrements (ZIP) » → un fichier `.zip` doit se télécharger, contenant plusieurs CSV.

---

## 6. Arrêter les serveurs

Dans chaque terminal, `Ctrl+C`. Si tu as créé une base SQLite locale (`backend/labo_stock.db`), tu peux la supprimer pour repartir d'un état propre au prochain test :

```bash
rm backend/labo_stock.db
```

---

## 7. En cas de problème

| Symptôme | Piste |
|---|---|
| Le backend plante au démarrage avec une erreur pydantic `extra_forbidden` | Tu as oublié de commenter `TEST_DATABASE_URL`, `ALERT_CHECK_INTERVAL_HOURS` ou `EXPIRY_ALERT_DAYS_BEFORE` dans `backend/.env` (§2.1 — regarde le message d'erreur, il indique laquelle des trois clés reste active). |
| `npm run dev` échoue avec une erreur liée à `engines` ou une syntaxe non supportée | Ta version de Node est trop ancienne (§1) — il en faut ≥ 20. |
| Page blanche / erreur dans la console navigateur au chargement | Vérifie que `backend` tourne bien et que `.env.local` du frontend pointe vers la bonne URL (§3.1). |
| Un bouton d'action (modifier/supprimer) est invisible | Probablement normal — les permissions varient selon le rôle connecté (voir `backend/app/core/permissions.py` ou `frontend/lab-manage/src/lib/permissions.ts` pour la matrice complète). |
| Tu trouves un vrai bug (pas ceux listés en §5.3/5.4) | Note-le (page, action, message d'erreur exact) — c'est exactement ce que ce test manuel doit détecter avant toute mise en production. |

---

Une fois cette checklist validée, on pourra discuter de la marche à suivre pour intégrer `refactor/complete` (PR vers `main`, revue, etc.).
