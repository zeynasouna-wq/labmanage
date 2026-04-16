# Guide de Configuration Admin - Production

## Pour configurer un admin en production sur Render

### 1️⃣ Définir les variables d'environnement sur Render

Naviguez vers votre service Render et ajoutez ces variables d'environnement :

```
ENVIRONMENT=production
FIRST_ADMIN_EMAIL=admin@labo.sn
FIRST_ADMIN_PASSWORD=Admin@2024!
FIRST_ADMIN_NAME=Administrateur
```

### 2️⃣ Créer l'admin après un redéploiement

Après le déploiement, exécutez cette commande pour créer l'admin :

**Depuis la console Render :**
```bash
python create_admin.py
```

**Ou avec arguments personnalisés :**
```bash
python create_admin.py --email admin@example.com --password "SecurePassword123!" --name "Admin Name"
```

### 3️⃣ Vérifier que l'admin est créé

La sortie devrait afficher :
```
✓ Admin user created successfully!
  Email: admin@labo.sn
  Name: Administrateur
  Role: admin
  Status: active
```

### 4️⃣ Se connecter

Utilisez les credentials pour vous connecter via Swagger UI ou l'API :

```bash
curl -X POST "https://labmanage.onrender.com/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@labo.sn",
    "password": "Admin@2024!"
  }'
```

## Environment Modes

### LOCAL (développement)
```
ENVIRONMENT=local
DATABASE_URL=sqlite:///./labomanage.db
DEBUG=true
```

### PRODUCTION (Render)
```
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://...  # Défini automatiquement par Render
```

## Sécurité - ⚠️ Important

1. **Changez le SECRET_KEY en production** - Générez une clé forte :
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

2. **Utilisez des mots de passe forts** - Au moins 8 caractères avec majuscules, minuscules, chiffres et symboles

3. **Ne commitez pas les credentials** - Utilisez toujours les variables d'environnement

4. **Sécurisez vos tokens JWT** - Les tokens expirent après (par défaut 480 minutes = 8 heures)

## Troubleshooting

### ❌ "Email ou mot de passe incorrect"
- Vérifiez que l'admin existe dans la base de données
- Relancez : `python create_admin.py`
- Vérifiez les credentials dans Render

### ❌ "REFRESH_TOKEN_EXPIRE_DAYS not found"
- Mettez à jour votre fichier `config.py`
- Redéployez l'application

### ❌ Circular Import Error
- La configuration est corrigée ! Vérifiez que `app/core/config.py` importe correctement
- Relancez le deployement

## Variables d'environnement complètes

Pour une configuration complète, utilisez :

```env
# Mode
ENVIRONMENT=production

# Base de données (automatique sur Render)
DATABASE_URL=postgresql://...

# Sécurité
SECRET_KEY=<généré-avec-la-commande-ci-dessus>

# Tokens
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin initial
FIRST_ADMIN_EMAIL=admin@labo.sn
FIRST_ADMIN_PASSWORD=Admin@2024!
FIRST_ADMIN_NAME=Administrateur

# API
API_HOST=0.0.0.0
API_PORT=8000

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```
