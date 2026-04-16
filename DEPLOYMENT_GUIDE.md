# 🚀 Guide Déploiement Complet - LaboStock

## 📋 Résumé Actuel

| Composant | URL | Status |
|-----------|-----|--------|
| **Backend (API)** | https://labmanage.onrender.com | ✅ Déployé |
| **Frontend** | https://labmanage-ag53.vercel.app | ✅ Déployé |
| **Base de Données** | PostgreSQL (Render) | ✅ Connectée |

---

## ⚙️ Configuration Requise

### 1️⃣ Backend Render (FAIT)
✅ Pydantic 2.9.2 (wheels pré-compilés)
✅ PostgreSQL database
✅ Export CSV endpoints
✅ FastAPI + Uvicorn

### 2️⃣ Frontend Vercel (À FAIRE)

**URGENT:** Configurer la variable d'environnement sur Vercel

#### Étapes:
1. Allez sur [Vercel Dashboard](https://vercel.com)
2. Sélectionnez le projet `labmanage`
3. **Settings** > **Environment Variables**
4. Ajouter une nouvelle variable:
   - **Name:** `NEXT_PUBLIC_API_BASE`
   - **Value:** `https://labmanage.onrender.com`
   - **Environments:** Production, Preview, Development
5. Cliquez **"Save"**

#### Redéployer:
1. Allez dans **Deployments**
2. Cherchez le dernier déploiement
3. Cliquez sur **⋯** (3 points)
4. Sélectionnez **"Redeploy"**

---

## 🧪 Vérification

### ✅ Backend OK?
```bash
curl https://labmanage.onrender.com/health
```

Devrait répondre :
```json
{"status": "healthy", "database": "connected", ...}
```

### ✅ Frontend OK?
1. Ouvrir https://labmanage-ag53.vercel.app
2. Ouvrir DevTools (F12)
3. Aller dans **Console**
4. Exécuter: `console.log(process.env.NEXT_PUBLIC_API_BASE)`
   - Deve afficher: `https://labmanage.onrender.com`

### ✅ CORS OK?
1. Essayer de se connecter sur Vercel
2. Devrait voir écran login
3. Entrer credentials: `admin@labo.sn` / `Admin@2024!`
4. Devrait logger sans erreur CORS

### ✅ Export OK?
1. Après login, le bouton "Exporter" doit être visible (rôle admin)
2. Cliquer et télécharger un CSV
3. Devrait fonctionner sans erreur

---

## 🔐 CORS Configuration

### Backend (Render)
Variable d'environnement:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://labmanage.onrender.com,https://labmanage-ag53.vercel.app
```

Si vous changez l'URL Vercel, mettez à jour `CORS_ORIGINS` sur Render.

### Frontend (Vercel)
Variable d'environnement:
```
NEXT_PUBLIC_API_BASE=https://labmanage.onrender.com
```

---

## 🔧 Développement Local

### Backend LOCAL
```bash
cd backend
python -m venv env
source env/bin/activate  # ou env\Scripts\activate.bat sur Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

API disponible: `http://localhost:8000`

### Frontend LOCAL
```bash
cd frontend/lab-manage
npm install
npm run dev
```

Frontend disponible: `http://localhost:3000`

Configuration `.env.local`:
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 📝 Checklist Déploiement

### Backend
- [x] Code pushé sur GitHub
- [x] Service créé sur Render
- [x] Database PostgreSQL créée
- [x] Variables d'env configurées
- [x] Déploiement réussi
- [x] Health check OK

### Frontend
- [ ] Code pushé sur GitHub
- [ ] Projet créé sur Vercel
- [ ] `NEXT_PUBLIC_API_BASE` configurée sur Vercel
- [ ] Frontend redéployé
- [ ] Connexion fonctionne
- [ ] Export fonctionne
- [ ] Aucune erreur CORS

---

## ❌ Dépannage

### Erreur CORS: "Permission was denied for loopback address"
**Cause:** Frontend essaie de se connecter à `localhost:8000`
**Solution:** 
1. Vérifier `NEXT_PUBLIC_API_BASE` sur Vercel
2. Redéployer le frontend
3. Hard refresh (Ctrl+Shift+R)

### Erreur CORS: "blocked by CORS policy"
**Cause:** Frontend URL pas autorisée
**Solution:**
1. Ajouter l'URL frontend dans `CORS_ORIGINS` du backend
2. Redéployer le backend
3. Attendre ~30s pour activation

### Login échoue
1. Vérifier credentials: `admin@labo.sn` / `Admin@2024!`
2. Vérifier que backend fonctionne: `https://labmanage.onrender.com/health`
3. Vérifier CORS dans DevTools (console)
4. Vérifier `NEXT_PUBLIC_API_BASE` en console du navigateur

### Export ne fonctionne pas
1. Vérifier que l'utilisateur est admin
2. Vérifier que `https://labmanage.onrender.com/export/csv/all` répond
3. Vérifier CORS dans DevTools Network tab

---

## 📞 Liens Utiles

- [Render Dashboard](https://render.com/dashboard)
- [Vercel Dashboard](https://vercel.com)
- [Backend Health](https://labmanage.onrender.com/health)
- [Backend Swagger](https://labmanage.onrender.com/docs)
- [Frontend](https://labmanage-ag53.vercel.app)

---

## 🎯 État Final

```
┌────────────────────────────────┐
│ User Browser                   │
│ https://labmanage-ag53.vercel  │
│ .app                           │
└────────────────┬───────────────┘
                 │
         ┌───────▼─────────┐
         │ Vercel          │
         │ (Frontend build)│
         └───────┬─────────┘
                 │ env: NEXT_PUBLIC_API_BASE
                 │ = https://labmanage...
                 │
        ┌────────▼────────────┐
        │ https://labmanage   │
        │ .onrender.com       │
        │ (Backend API)       │
        └────────┬────────────┘
                 │
        ┌────────▼────────────┐
        │ PostgreSQL          │
        │ (Render hosted)     │
        └─────────────────────┘
```

**Tout est prêt!** 🚀

