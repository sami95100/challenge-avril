# Challenge Avril

Une application web progressive (PWA) inspirée de Call of Duty Modern Warfare pour suivre des objectifs quotidiens.

## Fonctionnalités

- Suivi des objectifs personnels et professionnels
- Système de niveaux et XP
- Design inspiré de Call of Duty
- Fonctionne hors ligne
- Installation possible sur iPhone

## Technologies utilisées

- HTML
- CSS
- JavaScript
- Service Workers pour le fonctionnement hors ligne

## Installation

1. Clonez ce repository
2. Ouvrez index.html dans votre navigateur
3. Pour installer sur iPhone :
   - Ouvrez l'application dans Safari
   - Appuyez sur le bouton "Partager"
   - Sélectionnez "Sur l'écran d'accueil"

## Utilisation

1. Définissez vos objectifs quotidiens
2. Suivez votre progression
3. Gagnez de l'XP en complétant vos objectifs
4. Montez en niveau et débloquez de nouveaux rangs militaires

## Pour démarrer l'application localement

Vous pouvez servir l'application localement en utilisant un serveur local simple:

```bash
# Si vous avez Python installé
python -m http.server

# Si vous avez Node.js installé
npx serve
```

Puis ouvrez l'URL indiquée (généralement http://localhost:8000 ou http://localhost:3000) dans votre navigateur.

## À propos des icônes

Pour une PWA complète, vous devriez générer des icônes aux différentes tailles indiquées dans le manifest.json.
Vous pouvez utiliser des services en ligne comme [PWA Builder](https://www.pwabuilder.com/) ou [App Icon Generator](https://appicon.co/) pour générer ces icônes à partir d'une image.

## Fonctionnalités futures possibles

- Notifications pour rappeler l'utilisateur de mettre à jour ses progrès
- Graphiques de progression dans le temps
- Partage des accomplissements sur les réseaux sociaux
- Synchronisation des données entre plusieurs appareils
- Thèmes personnalisés
