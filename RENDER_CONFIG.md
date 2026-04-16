# Configuration Render - LaboStock

## 🚀 Backend sur Render

### ✅ Backend Déployé
- **URL** : https://labmanage.onrender.com
- **Base de données** : PostgreSQL (créée automatiquement par Render)
- **Runtime** : Python 3.11

### Variables d'Environnement Backend (à configurer sur Render)

Allez sur **Render Dashboard** > Votre service backend > **Settings** > **Environment**

Ajouter ces variables :

```
DATABASE_URL=postgresql://... (auto-généré par Render)
SECRET_KEY=your-secret-key-here-min-32-chars
DEBUG=false
FIRST_ADMIN_EMAIL=admin@labo.sn
FIRST_ADMIN_PASSWORD=your-admin-password
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://labmanage.onrender.com,https://labmanage-ag53.vercel.app
```

**Important:** Si votre frontend Vercel a une URL différente, changez `https://labmanage-ag53.vercel.app` par votre URL Vercel.

---

## 🌐 CORS Configuration

### Backend
Le backend accepte maintenant les origines suivantes :
- `http://localhost:3000` (développement)
- `http://localhost:8080` (développement)
- `https://labmanage.onrender.com` (production)

Pour ajouter d'autres domaines frontends, modifiez `CORS_ORIGINS` avec des origines séparées par des virgules.

### Endpoints
Tous les endpoints sont maintenant accessibles depuis :
- `https://labmanage.onrender.com/export/csv/...`
- `https://labmanage.onrender.com/products`
- etc.

---

## 🎨 Frontend sur Render

### Option 1 : Déployer le Frontend sur Render aussi

#### Étapes
1. Créez un nouveau service web sur Render
2. Connectez le repo GitHub `labmanage`
3. Configurez comme suit :

**Settings:**
```
Runtime: Node.js
Node Version: 20

Build Command: cd frontend/lab-manage && npm install && npm run build
Start Command: cd frontend/lab-manage && npm start

Environment Variables:
NEXT_PUBLIC_API_BASE=https://labmanage.onrender.com
```

#### Après le déploiement
- Frontend sera sur : `https://<your-app-name>.onrender.com`
- Backend sera sur : `https://labmanage.onrender.com`
- Les requêtes utilisent automatiquement `https://labmanage.onrender.com`

---

### Option 2 : Héberger le Frontend ailleurs (Vercel, Netlify, etc.)

Si vous déployez le frontend sur Vercel:

```
NEXT_PUBLIC_API_BASE=https://labmanage.onrender.com
```

Puis mettez à jour `CORS_ORIGINS` sur le backend :
```
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://labmanage.onrender.com
```

---

## 🔗 Communication Frontend-Backend

### Architecture Actuelle
```
Frontend (Render ou autre)
    ↓ HTTPS
Backend API (https://labmanage.onrender.com)
    ↓ 
PostgreSQL Database (Render)
```

### Code Frontend
Le frontend utilise automatiquement :
```typescript
const API_BASE = "https://labmanage.onrender.com";
```

Tous les appels API vont vers ce domaine avec authentification JWT.

---

## 🔒 Sécurité

✅ **CORS** : Configuré pour accepter les domaines spécifiques
✅ **HTTPS** : Toutes les communications sont chiffrées
✅ **JWT** : Authentification par token
✅ **Database** : PostgreSQL avec credentials Render

### À faire en production
- [ ] Changer `SECRET_KEY` en valeur sécurisée
- [ ] Changer `FIRST_ADMIN_PASSWORD` 
- [ ] Vérifier `DEBUG=false`
- [ ] Limiter `CORS_ORIGINS` aux domaines autorisés
- [ ] Configurer des backups de base de données

---

## 🧪 Test de Connexion

### 1. Vérifier le backend
```bash
curl https://labmanage.onrender.com/health
```

Devrait retourner :
```json
{"status": "healthy", "database": "connected", ...}
```

### 2. Tester une requête avec token
```bash
# 1. Login
curl -X POST https://labmanage.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@labo.sn","password":"Admin@2024!"}'

# Copier le token

# 2. Appeler une API protégée
curl https://labmanage.onrender.com/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Logs & Monitoring

### Accéder aux logs Render
1. Render Dashboard > Service > Logs
2. Chercher les erreurs ou CORS issues
3. Vérifier les variables d'environnement

### Erreurs Courantes

**401 Unauthorized**
- Token expiré ou invalide
- Vérifier les credentials

**403 Forbidden**
- Rôle insuffisant (besoin admin)
- Vérifier le rôle utilisateur

**500 Server Error**
- Vérifier les logs
- Vérifier DATABASE_URL
- Vérifier SECRET_KEY

---

## 🔄 Redéploiement

### Après modification du code

**Backend :**
```bash
git add .
git commit -m "Update config"
git push origin main
# Render redéploie automatiquement
```

**Frontend :**
Si le frontend est aussi sur Render, il redéploie aussi automatiquement.

---

## 📚 Ressources

- [Render Docs](https://render.com/docs)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)

---

**Dernière mise à jour** : 2026-04-16
