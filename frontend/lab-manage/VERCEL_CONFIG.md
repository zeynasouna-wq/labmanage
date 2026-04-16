# Configuration Vercel - LaboStock Frontend

## 🚀 Frontend déployé sur Vercel

URL : https://labmanage-ag53.vercel.app

---

## 🔧 Configuration des Variables d'Environnement

### Étapes pour Vercel

1. **Allez sur Vercel Dashboard**
   - Sélectionnez votre projet `labmanage`
   - Settings > Environment Variables

2. **Ajouter la variable**
   ```
   Key: NEXT_PUBLIC_API_BASE
   Value: https://labmanage.onrender.com
   ```

3. **Sauvegarder et Redéployer**
   - Cliquez sur "Save"
   - Allez dans "Deployments"
   - Cherchez le dernier déploiement
   - Cliquez sur "Redeploy" (ou les 3 points > Redeploy)

### ✅ Important
- Variables avec `NEXT_PUBLIC_` sont exposées au client
- `NEXT_PUBLIC_API_BASE` sera injecté au build time
- Il faut redéployer pour appliquer les changements

---

## 🧪 Test de Vérification

Après redéploiement, ouvrez la DevTools (F12) > Console sur Vercel:

```javascript
// Devrait afficher : https://labmanage.onrender.com
console.log(process.env.NEXT_PUBLIC_API_BASE)
```

---

## 🔄 Redéploiement Rapide

### Depuis la CLI Vercel
```bash
vercel env add NEXT_PUBLIC_API_BASE https://labmanage.onrender.com
vercel redeploy
```

### Depuis le Dashboard
1. Settings > Environment Variables
2. Vérifier `NEXT_PUBLIC_API_BASE=https://labmanage.onrender.com`
3. Deployments > Plus récent > Redeploy

---

## ❌ Erreurs Courants

### "CORS policy: Permission was denied"
- ❌ Frontend sur Vercel envoie requête à localhost:8000
- ✅ Solution: Ajouter NEXT_PUBLIC_API_BASE sur Vercel
- ✅ Solution: Redéployer

### "API not responding"
- Vérifier que backend Render fonctionne: `https://labmanage.onrender.com/health`
- Vérifier CORS dans backend settings

### Frontend va encore sur localhost
- Vérifier que Vercel a la variable d'env
- Voir les "Build Logs" pour confirmer la variable est injectée
- Peut-être besoin de hard refresh (Ctrl+Shift+R)

---

## 📝 Architecture Finale

```
┌─────────────────────────────────────────┐
│  Frontend (Vercel)                      │
│  https://labmanage-ag53.vercel.app      │
│                                         │
│  API_BASE env: NEXT_PUBLIC_API_BASE     │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ↓
┌──────────────────────────────────────────┐
│ Backend (Render)                         │
│ https://labmanage.onrender.com           │
│                                          │
│ CORS allows:                             │
│ - https://labmanage-ag53.vercel.app      │
│ - http://localhost:3000 (dev)            │
└──────────┬───────────────────────────────┘
           │
           ↓
    PostgreSQL (Render)
```

---

## 🎯 Checklist

- [ ] Variable d'env ajoutée sur Vercel Dashboard
- [ ] NEXT_PUBLIC_API_BASE = https://labmanage.onrender.com
- [ ] Frontend redéployé sur Vercel
- [ ] Tester la connexion depuis Vercel
- [ ] Vérifier console: API_BASE est correct
- [ ] Test login fonctionne sans CORS error
- [ ] Bouton Export visible pour admin
- [ ] Export fonctionne

---

## 📞 Support

Si ça ne marche pas:
1. Vérifier les Build Logs sur Vercel
2. Vérifier les Environment Variables sur Vercel
3. Vérifier CORS sur Render backend
4. Vérifier que https://labmanage.onrender.com/health répond
5. Hard refresh sur le navigateur (Ctrl+F5)

