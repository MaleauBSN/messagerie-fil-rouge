# Messagerie Fil-Rouge

Projet réalisé dans le cadre du cours **8WEB101 – Conception et programmation de sites Web** (UQAC, automne 2026).

Une messagerie instantanée Web permettant d'échanger des messages texte en temps réel.

**Site en ligne :** [GitHub Page](https://maleaubsn.github.io/messagerie-fil-rouge/)

**Lien du penpot:** https://design.penpot.app/#/view?file-id=c514c1fb-1cda-8125-8008-a362617a0fef&page-id=c514c1fb-1cda-8125-8008-a362617a0ff0&section=interactions&index=0&share-id=c649fc9e-4f65-428d-8fee-a078faff9b95

## Auteurs

- William
- Malo

## Fonctionnalités

### Principales
- Inscription / connexion
- Liste de contacts
- Liste des salons de conversation
- Envoi et réception de messages texte en temps réel
- Affichage horodaté des messages

### Secondaires
- **Distance et temps de trajet entre utilisateurs** — Dans chaque conversation, l'application affiche la distance et le temps de trajet estimé entre l'utilisateur et son contact, calculés en temps réel à partir de leurs adresses respectives via l'API Distancematrix.ai. Cette information apparaît directement dans l'en-tête du salon de discussion (ex. « 12 km · 18 min »), sans interrompre l'échange de messages.

## Technologies

- HTML / CSS / JavaScript
- Supabase (comptes, salons, messages)

## Structure du projet

Convention de nommage : noms de fichiers et de dossiers en minuscules, en français, avec les mots séparés par des tirets.

```
.
├── index.html                      # Page d'accueil
├── connexion.html                  # Connexion
├── inscription.html                # Inscription
├── chat.html                       # Messagerie
├── parametres.html                 # Paramètres
├── politique-confidentialite.html  # Politique de confidentialité
└── assets/
    ├── css/
    │   └── main.css                # Feuille de style
    ├── js/
    │   ├── main.js                 # Vérification des formulaires
    │   ├── supabase.js             # Client Supabase et authentification
    │   ├── geolocalisation.js      # Position et distance (API Distancematrix.ai)
    │   └── navigation.js           # Panneau Navigation
    └── docs/                       # Scripts SQL et documents du projet
```
