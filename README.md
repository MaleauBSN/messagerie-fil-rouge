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

- HTML / CSS / JavaScript
- Supabase (comptes, salons, messages)

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
