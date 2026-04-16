# Guide d'Export de Données - LaboStock

## 📋 Vue d'ensemble

LaboStock propose une fonctionnalité complète d'export de données en CSV. Vous pouvez exporter :
- ✅ Tous les enregistrements (ZIP avec tous les fichiers CSV)
- ✅ Historique complet des mouvements de stock
- ✅ Produits
- ✅ Alertes
- ✅ Utilisateurs
- ✅ Fournisseurs
- ✅ Localisations
- ✅ Catégories
- ✅ Lots de produits

---

## 🔌 API Endpoints

Tous les endpoints d'export nécessitent une authentification **Admin**.

### Export Complet (ZIP)
```
GET /export/csv/all
```
Retourne un fichier ZIP contenant tous les CSV avec timestamp.

**Réponse:** `application/zip`

**Exemple:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/export/csv/all \
  -o export.zip
```

---

### Exports Individuels

#### Produits
```
GET /export/csv/products
```
Fichiers: `produits.csv`

#### Mouvements de Stock
```
GET /export/csv/movements
```
Fichiers: `mouvements_stock.csv`
Inclut tous les mouvements d'entrée, sortie, ajustements, pertes.

#### Alertes
```
GET /export/csv/alerts
```
Fichiers: `alertes.csv`

#### Utilisateurs
```
GET /export/csv/users
```
Fichiers: `utilisateurs.csv`

#### Fournisseurs
```
GET /export/csv/suppliers
```
Fichiers: `fournisseurs.csv`

#### Localisations
```
GET /export/csv/locations
```
Fichiers: `localisations.csv`

#### Catégories
```
GET /export/csv/categories
```
Fichiers: `categories.csv`

#### Lots de Produits
```
GET /export/csv/lots
```
Fichiers: `lots_produits.csv`

---

## 🎨 Intégration Frontend (Next.js)

### 1. Utiliser le Composant Préfait

Un composant `ExportComponent.tsx` est disponible :

```tsx
import ExportComponent from '@/app/ExportComponent';

// Dans votre page/composant
<ExportComponent 
  token={userToken}
  apiBase="http://localhost:8000"
  onSuccess={(msg) => console.log(msg)}
  onError={(err) => console.error(err)}
/>
```

### 2. Appels Manuels via Fetch

```typescript
const downloadCSV = async (type: string, token: string) => {
  const response = await fetch(
    `http://localhost:8000/export/csv/${type}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export_${type}.csv`;
  a.click();
};
```

---

## 📊 Formats CSV

### Produits
| Colonne | Description |
|---------|-------------|
| ID | ID unique du produit |
| Nom | Nom du produit |
| Référence | Numéro de référence |
| Numéro Lot | Lot actuel |
| Description | Description |
| Stock Actuel | Quantité en stock |
| Stock Minimum | Seuil minimum |
| Stock Alerte | Seuil d'alerte |
| Unité | Unité de mesure |
| Date Expiration | Date d'expiration |
| Actif | Produit actif ou non |
| Fournisseur | Nom du fournisseur |
| Localisation | Lieu de stockage |
| Catégorie | Catégorie du produit |
| Date Création | Date de création |
| Date Modification | Dernière modification |

### Mouvements de Stock
| Colonne | Description |
|---------|-------------|
| ID | ID du mouvement |
| Produit | Nom du produit |
| Type Mouvement | entry, exit, adjustment, loss |
| Quantité | Quantité déplacée |
| Stock Avant | Stock avant mouvement |
| Stock Après | Stock après mouvement |
| Numéro Lot | Lot affecté |
| Raison | Raison du mouvement |
| Document Référence | Bon de commande, etc. |
| Utilisateur | Email de l'utilisateur |
| Date | Timestamp du mouvement |

### Alertes
| Colonne | Description |
|---------|-------------|
| ID | ID de l'alerte |
| Produit | Produit affecté |
| Type Alerte | low_stock, out_of_stock, expiry_soon, expired |
| Statut | active, acknowledged, resolved |
| Message | Description de l'alerte |
| Déclenché À | Date d'alerte |
| Reconnu À | Date de reconnaissance |
| Reconnu Par | Email de l'utilisateur |
| Résolu À | Date de résolution |

---

## ⚙️ Configuration Backend

### Services Utilisés
- `app/services/csv_export_service.py` - Service d'export CSV
- `app/routers/export.py` - Endpoints API

### Authentification
Tous les endpoints d'export requièrent :
```python
dependencies = [require_admin]
```

Seuls les administrateurs peuvent exporter les données.

### Gestion des Erreurs

```python
# L'API retourne une erreur HTTP 500 avec détails
{
  "detail": "Erreur lors de l'export: [description]"
}
```

---

## 🔒 Sécurité

- ✅ **Authentification requise** : Token JWT nécessaire
- ✅ **Autorisation Admin** : Seuls les admins peuvent exporter
- ✅ **HTTPS en production** : Assurez-vous d'utiliser HTTPS
- ✅ **Pas de données sensibles** : Les hashed passwords ne sont pas inclus
- ✅ **Audit** : Considérez la journalisation des exports

---

## 🚀 Cas d'Usage

### Sauvegarde Périodique
```bash
# Script bash pour sauvegarde mensuelle
#!/bin/bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://api.labo.local/export/csv/all \
  -o backups/labmanage_$(date +%Y%m%d_%H%M%S).zip
```

### Intégration BI/Analytics
Importez les CSV dans Power BI, Tableau, ou votre outil préféré pour l'analyse.

### Migration de Données
Exportez complètement avant une migration ou mise à jour majeure.

### Audit et Conformité
Conservez les fichiers d'export pour traçabilité légale/réglementaire.

---

## 🐛 Dépannage

### L'export est vide
- Vérifiez que vous avez des données dans les tables
- Assurez-vous d'être connecté en tant qu'admin

### Erreur 401 (Non autorisé)
- Vérifiez votre token JWT
- Vérifiez que votre rôle est "admin"

### Erreur 500 (Serveur)
- Consultez les logs du serveur backend
- Vérifiez la base de données

### Le ZIP n'est pas créé
- Vérifiez les permissions du serveur
- Assurez-vous que le module `zipfile` est installé

---

## 📝 Notes Importantes

1. **Encodage** : Tous les fichiers utilisent UTF-8
2. **Délimiteur** : Virgule (`,`)
3. **Dates** : Format ISO 8601 (`YYYY-MM-DD HH:MM:SS`)
4. **Tailles** : Pour très grands exports (>10K lignes), utilisez le endpoint ZIP progressif
5. **Fréquence** : Limitez les exports fréquents pour éviter la charge serveur

---

**Dernière mise à jour** : 2026-04-16
