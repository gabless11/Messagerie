# Messagerie personnelle

Application web de messagerie permettant à des utilisateurs de créer un compte, d’ajouter des contacts et d’échanger des messages privés en temps réel.

## Fonctionnalités

- Inscription et connexion par adresse courriel avec Supabase Auth.
- Choix d’un nom d’utilisateur à l’inscription et enregistrement du profil.
- Recherche et ajout de contacts par nom d’utilisateur.
- Création ou récupération d’une conversation entre deux contacts.
- Envoi, modification et suppression de ses propres messages.
- Réception en temps réel des nouveaux messages, modifications et suppressions via Supabase Realtime.
- Barre de contacts redimensionnable et conversations récentes enregistrées dans le navigateur.

## Organisation des fichiers

- `index.html` : page d’accueil, d’inscription et de connexion.
- `conversation.html` et `conversation.js` : affichage et gestion des conversations et messages.
- `contacts.html` et `contacts.js` : liste des contacts et formulaire d’ajout.
- `Messagerie.js` : interactions générales, paramètres et préférences de l’interface.
- `Messagerie.css` : styles et mise en page adaptative.
- `supabase.js` : initialisation du client Supabase et logique d’authentification.
- `parametres.html` : panneau de paramètres.

## Supabase

L’application utilise Supabase pour l’authentification, les profils, les contacts, les conversations et les messages. Les noms de tables configurés dans le code se trouvent dans `supabase.js`.

Le projet doit disposer des tables et colonnes attendues par les requêtes de l’application, ainsi que des privilèges et politiques RLS adaptés. Pour recevoir les changements instantanément, la table `Messages` doit également être activée dans Supabase Realtime.

Le client utilise la clé publique Supabase prévue pour le navigateur. Les permissions d’accès aux données doivent être imposées par Supabase, notamment au moyen de RLS; aucune clé secrète ou clé de service ne doit être intégrée au code client.

## Lancer l’application

Ouvrez `index.html` avec un serveur de prévisualisation local (par exemple Live Preview dans VS Code), puis inscrivez-vous ou connectez-vous. Une adresse courriel valide et une configuration Supabase fonctionnelle sont nécessaires.

## Tester avec les comptes de démonstration

Deux comptes de test sont prévus : **Gab** et **Zac**.
Gab : glessard9@etu.uqac.ca --> 123456
Zac : zboivin@etu.uqac.ca --> 123456
