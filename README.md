# FRONTEND - ITSM V1 (React + TypeScript)
## Projet : Outil de Gestion des Services IT
### MCI CARE CI

---

## 🚀 TECHNOLOGIES

- **React 18** : Bibliothèque UI
- **TypeScript** : Typage statique
- **Vite** : Build tool et dev server
- **Tailwind CSS** : Framework CSS utilitaire
- **React Router** : Routage
- **Recharts** : Graphiques et visualisations
- **Lucide React** : Icônes
- **date-fns** : Manipulation de dates

---

## 📁 STRUCTURE DU PROJET

```
frontend/
├── src/
│   ├── components/          # Composants réutilisables
│   │   └── PrivateRoute.tsx
│   ├── contexts/           # Contextes React
│   │   └── AuthContext.tsx
│   ├── layouts/            # Layouts de pages
│   │   └── AdminLayout.tsx
│   ├── pages/             # Pages de l'application
│   │   ├── admin/         # Pages administrateur
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── UserDetails.tsx
│   │   │   ├── Tickets.tsx
│   │   │   ├── TicketDetails.tsx
│   │   │   ├── Assets.tsx
│   │   │   ├── AssetDetails.tsx
│   │   │   ├── Knowledge.tsx
│   │   │   ├── KnowledgeDetails.tsx
│   │   │   ├── Timesheet.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   └── auth/          # Pages d'authentification
│   │       └── Login.tsx
│   ├── App.tsx            # Composant principal
│   ├── main.tsx           # Point d'entrée
│   └── index.css          # Styles globaux
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## 🎨 FONCTIONNALITÉS

### Dashboard Administrateur
- Vue d'ensemble avec statistiques
- Graphiques de performance
- Tickets récents
- Indicateurs KPI

### Gestion des utilisateurs
- Liste des utilisateurs
- Détails utilisateur
- Création/Modification/Suppression

### Gestion des tickets
- Liste des tickets
- Détails du ticket
- Commentaires et historique
- Pièces jointes
- Gestion des statuts et priorités

### Gestion des actifs IT
- Inventaire des actifs
- Détails des actifs
- Historique de maintenance
- Spécifications techniques

### Base de connaissances
- Articles et ressources
- Catégorisation
- Système de notation
- Statistiques de vues

### Gestion du temps (Timesheet)
- Entrées de temps
- Validation par les managers
- Justification des retards
- Performance des techniciens
- Graphiques de temps

### Rapports
- Rapports personnalisables
- Graphiques et visualisations
- Export de données
- Analyse de performance
- Rapports SLA

### Paramètres
- Configuration générale
- Paramètres de notifications
- Paramètres de sécurité
- Configuration email
- Paramètres SLA

---

## 🛠️ INSTALLATION

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build de production
npm run preview
```

---

## 🔧 CONFIGURATION

### Configuration de l'API

Le proxy API est configuré dans `vite.config.ts` pour rediriger les requêtes `/api` vers `http://localhost:8080`.

Pour configurer l'URL de l'API en production, créez un fichier `.env` à la racine du projet :

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### Structure des services

- `src/config/api.ts` : Configuration de l'API et fonction utilitaire pour les requêtes
- `src/services/authService.ts` : Service d'authentification (login, register, forgot password)
- `src/contexts/AuthContext.tsx` : Contexte d'authentification connecté au backend

### Endpoints d'authentification

- `POST /api/v1/auth/login` : Connexion
- `POST /api/v1/auth/register` : Inscription
- `POST /api/v1/auth/forgot-password` : Mot de passe oublié
- `GET /api/v1/auth/me` : Vérification du token (optionnel)

---

## 📝 NOTES

- L'authentification est connectée au backend
- Les autres fonctionnalités utilisent encore des données mockées
- Le token JWT est stocké dans le localStorage

---

**Version : 1.0**
**Framework : React + TypeScript + Vite**
**Styling : Tailwind CSS**
