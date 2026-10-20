# Reste à vivre

Appli iPhone de gestion de budget : combien tu peux dépenser jusqu'à ta prochaine paie, sans te soucier des factures.
Faite avec [Expo](https://expo.dev) (React Native + TypeScript).

## Ce que fait l'appli

- **Reste à vivre** : ce qui est dépensable jusqu'à la paie, par jour, et un statut (large, ça passe, serré) calculé par rapport à ton budget de vie.
- **Pockets** : Courant, Factures, Annuelles lissées, Dettes, Sécurité, Objectifs et Épargne bloquée.
- **Jour de paie automatique** : le salaire paie d'abord les factures, les annuelles, les mensualités de dettes, les objectifs et la sécurité, garde ton budget de vie, puis une part de la marge part sur les dettes et en épargne.
- **Épargne bloquée** : retrait uniquement avec une raison, une explication et 48 h de délai.
- **Dettes** : mensualités payées à la paie, pocket pour rembourser plus vite, conseil de la plus petite dette d'abord.
- **Objectifs** : avec une date (l'appli calcule combien mettre de côté) ou un montant par mois, et un modèle **Déménagement** (dépôt de garantie, frais d'agence au plafond légal, etc.).
- **Détection des abonnements** : les paiements qui reviennent chaque mois (salle de sport, Spotify, Netflix…) sont ajoutés automatiquement aux charges, et les changements de prix sont suivis.
- **Envies (règle des 48 h)** : un achat plaisir attend 48 h avant que tu décides.
- **Stats** : dépenses par catégorie, revenus et dépenses sur 6 mois, évolution de l'épargne et des dettes. Un « mois » va d'une paie à la suivante.

Design « Nuit » : fond presque noir, cartes en verre, police Geist, accent rouge (couleurs inspirées de Malkidow). Quatre onglets dans une barre flottante avec le bouton + au centre : Accueil (jauge du reste à vivre), Stats, Pockets (grille de pockets), Budget. Le compte et les réglages s'ouvrent depuis l'initiale en haut à droite, le jour de paie depuis Pockets. Les animations sont coupées si « Réduire les animations » est activé sur l'iPhone.

Les données sont pour l'instant **des données d'exemple** (faux compte bunq). Tout est enregistré sur le téléphone.

## Tester sur ton iPhone (Mac ou PC)

1. Installe [Node.js](https://nodejs.org) (version 20 ou plus) sur ton ordinateur.
2. Installe l'appli **Expo Go** sur ton iPhone depuis l'App Store (mets-la à jour si elle est déjà installée : le projet utilise le SDK Expo 57, celui de la version App Store).
3. Dans un terminal :

   ```sh
   git clone https://github.com/JoeyyFrench/joeyyfrench-bankapp.git
   cd joeyyfrench-bankapp
   npm install
   npx expo start
   ```

4. Scanne le QR code affiché avec l'appareil photo de l'iPhone. L'ordinateur et le téléphone doivent être sur le même Wi-Fi (sinon : `npx expo start --tunnel`).

## Installer l'appli pour de vrai (TestFlight)

Il faut un compte Apple Developer (99 $/an). Pas besoin de Mac, la compilation se fait dans le cloud avec EAS :

```sh
npx eas-cli@latest login
npx eas-cli@latest build --platform ios
npx eas-cli@latest submit --platform ios
```

## Développement

```sh
npm test           # tests du moteur de calcul
npm run typecheck  # TypeScript
npx expo lint      # ESLint
```

```
src/
  app/          écrans (Expo Router) : (tabs)/ Accueil, Stats, Pockets, Budget + compte (modale)
  components/   bannières, toast, formulaires (feuilles modales)
  domain/       moteur de calcul pur, testé : reste à vivre, jour de paie, objectifs, dettes, détection des abonnements, stats
  store/        état de l'appli + sauvegarde locale (expo-sqlite/kv-store)
  ui/           thème « Nuit », composants, animations et graphiques (react-native-svg)
```

## Prochaine étape : connexion bunq

La connexion réelle passera par un petit serveur (la clé API bunq ne doit jamais être dans l'appli) qui :

- lit le solde et les opérations avec une clé API personnelle bunq, et reçoit les nouvelles opérations par webhook ;
- fait les virements entre sous-comptes le jour de paie (Factures, Épargne, Dettes…), uniquement entre tes propres comptes.

L'appli enverra alors les vraies opérations au moteur de calcul à la place des données d'exemple.
