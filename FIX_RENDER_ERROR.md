# 🔧 Fix Render Deployment Error

## Problème
```
==> Exited with status 1
==> Running 'uvicorn main:app --host 0.0.0.0 --port 10000'
```

Le serveur ne trouvait pas `main.py` car il était dans `/backend`.

## ✅ Solution Appliquée

1. **Créé `start.sh` à la racine**
   - Script qui change vers `/backend` puis lance uvicorn
   - Render exécute: `bash start.sh`

2. **Mis à jour `render.yaml`**
   - buildCommand: Direct pip install au lieu de bash script
   - startCommand: `bash start.sh` (simple et clair)

3. **Ajouté des variables d'environnement**
   - DATABASE_URL (auto via database)
   - DEBUG=false
   - CORS_ORIGINS (pour allow Vercel frontend)

## 🚀 Étapes pour Redéployer

### 1. Push les changements

```bash
git add .
git commit -m "Fix Render deployment: add start.sh and fix render.yaml"
git push origin main
```

### 2. Redéployer sur Render

**Option A: Auto-redeploy**
- Render détecte le push
- Redéploie automatiquement (peut prendre ~2 min)

**Option B: Manual redeploy**
1. Allez sur [Render Dashboard](https://render.com/dashboard)
2. Sélectionnez `labmanage-backend` service
3. Cliquez **"Manual Deploy"** ou **"Trigger Deploy"**

### 3. Ajouter SECRET_KEY (IMPORTANT)

Render Dashboard > `labmanage-backend` > Settings > Environment

Ajouter une variable:
- **Name**: `SECRET_KEY`
- **Value**: Générez une clé sécurisée (min 32 chars)
  
Exemple:
```
sk_prod_abcd1234efgh5678ijkl9012mnop3456
```

Ou générez via Python:
```python
import secrets
secrets.token_urlsafe(32)
```

### 4. Monitoring de Déploiement

1. Allez dans **Deployments**
2. Cherchez le nouveau déploiement
3. Cliquez pour voir les logs
4. Cherchez:
   - ✅ "Build successful" ✓
   - ✅ "Uvicorn running on" ✓
   - ✓ Aucune erreur

## 🧪 Test Après Déploiement

```bash
# Health check
curl https://labmanage.onrender.com/health

# Devrait retourner:
# {"status":"healthy","database":"connected",...}
```

## ⚠️ Fichiers Modifiés

- ✅ `start.sh` - Créé à la racine
- ✅ `render.yaml` - Mis à jour
- ✅ Config de base prête

## 🎯 Prochaines Étapes

1. Push et redéployer
2. Ajouter SECRET_KEY sur Render
3. Vérifier les logs
4. Tester health endpoint
5. Frontend devrait marcher

---

**Le problème est résolu!** Une fois les étapes suivies, le backend fonctionnera. 🚀
