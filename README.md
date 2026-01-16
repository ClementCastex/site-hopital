# Site Hôpital - Système de Réservation

Site web pour une maternité avec système de réservation multi-étapes pour les consultations.

## 📖 Contexte

Ce projet a été réalisé dans le cadre d'un exercice de design UX, suite à plusieurs jours d'étude de cas. L'objectif était de concevoir et développer une interface de réservation intuitive et progressive, en mettant l'accent sur l'expérience utilisateur et la facilité de navigation à travers les différentes étapes du processus de réservation.

## 🚀 Fonctionnalités

- **Page d'accueil** : Parcours des parents (Grossesse, Accouchement, Après accouchement, Sortie d'hôpital)
- **Système de réservation** : Réservation en plusieurs étapes avec sélection du professionnel, type de rendez-vous, date et horaire
- **Base de données** : Prisma avec SQLite pour gérer les professionnels, disponibilités et réservations

## 📋 Prérequis

- Node.js (v18 ou supérieur)
- npm

## 🛠️ Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer la base de données
npm run prisma:push

# Charger les données des psychologues
npm run prisma:seed
```

**Ou en une seule commande :**

```bash
npm run setup
```

### 3. Vérifier la configuration (optionnel)

```bash
npm run check
```

### 4. Démarrer le serveur

```bash
npm run dev
```

Le serveur sera accessible sur `http://localhost:3000`

## 📁 Structure du projet

```
site-hopital/
├── index.html              # Page d'accueil
├── reservation.html        # Page de réservation
├── reservation.js         # Logique de réservation (frontend)
├── style.css              # Styles CSS
├── server.js              # Serveur Express (backend)
├── package.json           # Dépendances npm
├── prisma/
│   ├── schema.prisma      # Schéma de base de données
│   ├── seed.js           # Données initiales (4 psychologues)
│   └── dev.db            # Base de données SQLite (générée)
└── images/               # Images du site
```

## 🔌 API Endpoints

- `GET /api/health` - Vérifier l'état du serveur
- `GET /api/doctors?type=Psychologue` - Liste des professionnels (filtré par type)
- `GET /api/doctors/:doctorId/availabilities?date=YYYY-MM-DD` - Disponibilités d'un professionnel
- `POST /api/reservations` - Créer une réservation

## 🎨 Design

- **Couleurs principales** : Bleu (#0c3eb4) et Jaune (#fce562)
- **Interface responsive** : Adapté mobile et desktop
- **Blocs progressifs** : Les étapes de réservation s'empilent progressivement

## 📝 Scripts disponibles

| Commande                  | Description                                   |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Démarre le serveur                            |
| `npm run check`           | Vérifie la configuration                      |
| `npm run setup`           | Configuration complète (génère + push + seed) |
| `npm run prisma:generate` | Génère le client Prisma                       |
| `npm run prisma:push`     | Crée/met à jour la base de données            |
| `npm run prisma:seed`     | Charge les données des psychologues           |

## 🐛 Dépannage

### Le serveur ne démarre pas

**Erreur : "Cannot find module '@prisma/client'"**

```bash
npm install
npm run prisma:generate
```

**Erreur : "Database does not exist"**

```bash
npm run prisma:push
```

**Erreur : "No doctors found"**

```bash
npm run prisma:seed
```

### Le serveur démarre mais l'API ne répond pas

1. Vérifiez que le serveur écoute sur le port 3000
2. Testez l'endpoint de santé : `http://localhost:3000/api/health`
3. Vérifiez les logs du serveur dans le terminal

## ⚠️ Notes importantes

- La base de données SQLite est créée dans `prisma/dev.db`
- Le serveur doit rester actif pendant l'utilisation de l'application
- Les données sont chargées pour 30 jours à partir d'aujourd'hui
