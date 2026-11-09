# Wallo

Projet réalisé dans le cadre du cours **8WEB101 – Conception et programmation de sites Web** (UQAC, automne 2026).

Wallo est une messagerie instantanée Web permettant d'échanger des messages texte en temps réel.

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
- **Notification à la réception d'un message** : badge rouge avec le nombre de messages non lus sur le contact ou le salon, nombre affiché dans le titre de l'onglet, et petit son (désactivable dans les Paramètres).
- **Indicateurs** : pastille « en ligne / hors ligne » sur les contacts, « X est en train d'écrire... » dans la conversation, et statut « Envoyé / Reçu / Lu » sous les messages directs envoyés.
- **Distance et temps de trajet entre utilisateurs** — Dans chaque conversation, l'application affiche la distance et le temps de trajet estimé entre l'utilisateur et son contact, calculés à partir de leurs positions GPS respectives (géolocalisation du navigateur, avec autorisation de l'utilisateur) via l'API [Distancematrix.ai](https://distancematrix.ai). Ces informations s'affichent dans le panneau Navigation, ouvert par le bouton « Agrandir » de la conversation, avec un bouton « Mettre à jour » et des liens d'itinéraire vers Google Maps et Waze. La position n'est réenregistrée et l'API n'est rappelée que si l'utilisateur s'est déplacé de plus de 10 m ou clique sur « Mettre à jour », sans interrompre l'échange de messages.

## Technologies

| Rôle | Choix |
|---|---|
| Interface | HTML, CSS, JavaScript |
| Authentification et base de données (incluant le temps réel) | [Supabase](https://supabase.com) (PostgreSQL) |
| Bibliothèque côté client | `supabase-js` (chargée par CDN) |
| Distance et temps de trajet | API [Distancematrix.ai](https://distancematrix.ai) |
| Hébergement | GitHub Pages |

Il n'y a **pas de configuration de serveur Web** : le navigateur communique directement avec Supabase.

## Fonctionnement en bref

- **Temps réel** : le navigateur s'abonne aux nouveaux messages avec Supabase Realtime (WebSocket). Par sécurité, la conversation ouverte est aussi rechargée toutes les 5 secondes, ce qui garantit que les messages arrivent même si le WebSocket est interrompu.
- **Accès aux données** : les règles de sécurité de Supabase (RLS) limitent la lecture aux utilisateurs connectés. Un message privé n'est visible que par son expéditeur et son destinataire, et les salons de conversation sont publics.
- **Position** : la position d'un utilisateur n'est enregistrée qu'avec son autorisation et seulement s'il s'est déplacé de plus de 10 m ou s'il demande une mise à jour.

## Limites connues

- La clé de l'API Distancematrix.ai est visible dans le code du site, car celui-ci n'a pas de serveur. Le choix est assumé dans le cadre de ce projet étudiant.
- Tous les utilisateurs inscrits sont des contacts les uns des autres, il n'y a pas de demande d'ajout de contact.
- Le partage d'images n'est pas implémenté.
- La distance n'est affichée que si le contact a déjà enregistré sa position.

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
    └── js/
        ├── main.js                 # Vérification des formulaires
        ├── supabase.js             # Client Supabase, authentification, contacts, salons et messages
        ├── indicateurs.js          # En ligne, « en train d'écrire », notifications et accusés de lecture
        ├── parametres.js           # Page Paramètres (pseudo, mot de passe, son)
        ├── geolocalisation.js      # Position et distance (API Distancematrix.ai)
        └── navigation.js           # Panneau Navigation
```

## Architecture

### Rôle de chaque fichier JavaScript
Les fichiers sont chargés en fin de `<body>`, dans l'ordre où ils sont écrits. L'ordre est une dépendance : un fichier utilise les fonctions des fichiers chargés avant lui.

```
main.js → supabase-js (CDN) → supabase.js → geolocalisation.js → navigation.js → indicateurs.js
```

- `main.js` : vérification des formulaires (courriel, mot de passe), sans dépendance.
- `supabase.js` : client Supabase, authentification, contacts, salons, messages et temps réel. C'est le fichier de base, utilisé par toutes les pages.
- `geolocalisation.js` : position de l'utilisateur et appel à l'API de distance.
- `navigation.js` : panneau Navigation, qui s'appuie sur `geolocalisation.js`.
- `indicateurs.js` : en ligne, « en train d'écrire », notifications et accusés de lecture. Il utilise le client et les fonctions de `supabase.js`.
- `parametres.js` : page Paramètres, qui utilise `supabase.js`.

Chaque page ne charge que ce dont elle a besoin : par exemple `chat.html` charge tous les fichiers, alors que `connexion.html` ne charge que `main.js` et `supabase.js`.

### Circulation d'un message
Un message envoyé est enregistré dans la table `messages`, puis affiché à l'écran. L'autre personne le reçoit par l'abonnement temps réel de Supabase (avec la relecture de secours toutes les 5 secondes).

### Gestion des sessions
Après la connexion, la personne est redirigée vers `chat.html`, et après la déconnexion vers `connexion.html`. La page Paramètres vérifie la session au chargement et renvoie vers `connexion.html` si personne n'est connecté. Dans le chat, sans session, les règles RLS de Supabase refusent de toute façon l'accès aux données.

## Base de données
Quatre tables dans Supabase (PostgreSQL).

### Table `profiles`
Un profil par utilisateur : sert de liste de contacts.

| Colonne | Remarque |
|---|---|
| `user_id` | identifiant de l'utilisateur (`auth.users.id`) |
| `user_name` | pseudo affiché |

### Table `channels`
Les salons de conversation (publics).

| Colonne | Remarque |
|---|---|
| `id` | clé primaire |
| `name` | nom du salon |
| `created_by` | identifiant du créateur |
| `created_at` | date de création |

### Table `messages`
Les messages directs et les messages de salon.

| Colonne | Remarque |
|---|---|
| `id` | clé primaire |
| `content` | contenu du message |
| `user_id` | expéditeur |
| `destinataire_id` | destinataire (message direct seulement) |
| `channel_id` | salon (message de salon seulement) |
| `created_at` | date et heure d'envoi |
| `delivered_at` | date de réception (accusé « Reçu ») |
| `read_at` | date de lecture (accusé « Lu ») |

Un message direct a un `destinataire_id` et pas de `channel_id`, un message de salon a l'inverse.

### Table `coordonnees`
La dernière position connue de chaque utilisateur (une seule ligne par utilisateur).

| Colonne | Remarque |
|---|---|
| `user_id` | identifiant de l'utilisateur, unique |
| `latitude` | latitude en degrés décimaux |
| `longitude` | longitude en degrés décimaux |
| `updated_at` | date de la dernière mise à jour |

### Sécurité (RLS)
La clé « publishable » de `supabase.js` est visible par tout le monde (c'est normal). La protection repose sur la **sécurité au niveau des lignes (RLS)** de PostgreSQL :

- **`profiles`** : lecture pour toute personne connectée, création et modification de son propre profil seulement.
- **`messages`** : un message direct n'est lisible que par son expéditeur et son destinataire, un message de salon par toute personne connectée. On ne peut envoyer un message qu'en son propre nom. Le contenu d'un message ne peut pas être modifié ni supprimé : seul le destinataire peut remplir `delivered_at` et `read_at`.
- **`coordonnees`** : lecture pour toute personne connectée (pour calculer la distance avec un contact), écriture de sa propre ligne seulement.
- **`channels`** : lecture et création pour toute personne connectée, avec `created_by` égal à son propre identifiant.

## Installation
1. Créer un projet sur [supabase.com](https://supabase.com).
2. Créer les quatre tables décrites plus haut, activer la RLS avec les règles de la section Sécurité, et ajouter `messages` et `channels` à la publication `supabase_realtime` (Realtime).
3. Dans **Authentication** -> **Sign In / Providers**, vérifier que la connexion par courriel est activée et désactiver la confirmation par courriel (le profil est créé par le navigateur juste après l'inscription).
4. Dans `assets/js/supabase.js`, remplacer `SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY` par ceux de votre projet (**Project Settings > API**).
5. Dans `assets/js/geolocalisation.js`, remplacer `DISTANCEMATRIX_KEY` par votre clé [Distancematrix.ai](https://distancematrix.ai).
6. Ouvrir le site avec un serveur local (par exemple MAMP, ou l'extension *Live Preview* de VS Code) : la géolocalisation du navigateur demande une adresse `localhost` ou HTTPS.

> Ne jamais mettre la clé `secret` / `service_role` dans le code du navigateur.

## Corrections et pistes d'amélioration
- Valider avec de vrais comptes le temps réel et les accusés Envoyé / Reçu / Lu.
- Déplacer l'appel à l'API de distance côté serveur pour ne plus exposer la clé.
- Ajouter une demande d'ajout de contact plutôt que de lister tous les inscrits.
- Permettre le partage d'images.
- Charger les anciens messages par pagination (afficher les derniers, puis charger plus au défilement).
- Afficher les erreurs dans la page plutôt que dans la console.
- Désactiver les boutons d'action dans l'attente d'une réponse du service.
