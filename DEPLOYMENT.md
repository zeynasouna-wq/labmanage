# Guide de Déploiement sur Render

## Configuration pour le déploiement sur Render

### 1. **Fichiers configurés :**
- ✅ `render.yaml` : Configuration complète du déploiement
- ✅ `backend/build.sh` : Script de construction optimisé
- ✅ `backend/runtime.txt` : Spécifie Python 3.12
- ✅ `backend/requirements.txt` : Dépendances mises à jour
- ✅ `Dockerfile` : Image Docker alternative (si besoin)

### 2. **Étapes de déploiement sur Render :**

#### Option A : Déploiement via Git (Recommandé)
1. Pushez vos changements sur GitHub :
   ```bash
   git add .
   git commit -m "Setup Render deployment"
   git push origin main
   ```

2. Connectez votre repo GitHub à Render :
   - Allez sur https://render.com
   - Cliquez sur "New +" → "Web Service"
   - Connectez votre repo GitHub
   - Render détectera automatiquement le `render.yaml`

3. Configurez les secrets/variables manquantes :
   - Dans Render Dashboard, allez à "Settings"
   - Ajoutez ces **Environment Variables** si nécessaire :
     ```
     SECRET_KEY=<générer-une-clé-sécurisée>
     FIRST_ADMIN_EMAIL=admin@labo.sn
     FIRST_ADMIN_PASSWORD=<mot-de-passe-admin>
     ```

#### Option B : Déploiement via Blueprint (YAML avancé)
- Render lira automatiquement `render.yaml` à la racine

### 3. **Problème pydantic-core résolu :**
Le problème d'erreur `pydantic-core` est résolu par :
- ✅ `--prefer-binary` dans build.sh (utilise les wheels compilés)
- ✅ Python 3.12 qui a plus de wheels disponibles
- ✅ `psycopg2-binary` pour PostgreSQL

### 4. **Base de données :**
- Render crée automatiquement une instance PostgreSQL
- DATABASE_URL est défini automatiquement dans les env vars
- Les tables sont créées au démarrage (main.py)

### 5. **Variables d'environnement importants :**
```
DATABASE_URL=postgresql://[auto-généré par Render]
SECRET_KEY=[à générer]
DEBUG=false (production)
FIRST_ADMIN_EMAIL=admin@labo.sn
FIRST_ADMIN_PASSWORD=[à définir]
```

### 6. **Pour tester localement avant de deployer :**
```bash
# Installer les dépendances
pip install -r backend/requirements.txt

# Lancer le serveur
cd backend
uvicorn main:app --reload
```

### 7. **Après le déploiement :**
- Accédez au service sur `https://[votre-app].onrender.com`
- Consultez les logs dans Render Dashboard pour les erreurs
- La documentation API est disponible sur `/docs`

### 8. **Si le déploiement échoue encore :**

**Option 1 : Downgrader pydantic (moins de dépendances Rust)**
```ini
pydantic==2.9.2
pydantic-settings==2.5.0
```

**Option 2 : Utiliser le Dockerfile**
- Dans Render, changez le "Runtime" à "Docker"
- Render détectera automatiquement le `Dockerfile`

**Option 3 : Contacter le support Render**
- Fournissez les logs d'erreur complets
- Mentionnez le problème avec pydantic-core 2.27.1

---

**Notes importantes :**
- ⚠️ Changez `SECRET_KEY`, `FIRST_ADMIN_PASSWORD` en production
- ⚠️ Changez `CORS allow_origins` (actuellement `["*"]`) en production
- ✅ Les migrations de base de données se font automatiquement
