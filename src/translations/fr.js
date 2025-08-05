export default {
  common: {
    buttons: {
      back: 'Retour',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      confirm: 'Confirmer',
      loading: 'Chargement...',
      refresh: 'Actualiser',
      upload: 'Télécharger',
      submit: 'Soumettre',
      close: 'Fermer'
    },
    labels: {
      name: 'Nom',
      email: 'Email',
      password: 'Mot de passe',
      search: 'Rechercher',
      filter: 'Filtrer',
      sort: 'Trier'
    },
    messages: {
      success: 'Succès !',
      error: 'Une erreur s\'est produite',
      noData: 'Aucune donnée disponible',
      loading: 'Chargement...',
      saved: 'Enregistré avec succès'
    }
  },
  
  nav: {
    home: 'Accueil',
    game: 'Jeu',
    admin: 'Panneau Admin',
    history: 'Historique des Jeux',
    upload: 'Télécharger Photo'
  },

  home: {
    title: 'Jeu de Photos de Bébé',
    subtitle: 'Devinez qui est qui sur ces adorables photos de bébé !',
    buttons: {
      uploadPhoto: 'Télécharger Photo',
      joinGame: 'Rejoindre le Jeu',
      adminPanel: 'Panneau Admin',
      gameHistory: 'Historique des Jeux'
    }
  },

  upload: {
    title: 'Ajouter une photo',
    dragDrop: 'Cliquez pour ajouter une photo de bébé',
    fileInfo: 'Max 5MB • JPG, PNG, GIF',
    whoIsThis: 'Qui est sur cette photo ?',
    addNewPerson: '+ Ajouter une nouvelle personne',
    enterName: 'Entrez le nom de la personne',
    uploadSuccess: 'Téléchargement Réussi !',
    uploadSuccessMessage: 'Votre photo de bébé a été ajoutée au jeu.',
    uploadButton: 'Ajouter Photo',
    uploading: 'Téléchargement...',
    tip: '💡 Astuce : Les photos de bébé claires et bien éclairées fonctionnent le mieux pour le jeu !',
    errors: {
      fileTooLarge: 'La taille du fichier doit être inférieure à 5MB',
      invalidFileType: 'Veuillez sélectionner un fichier image',
      missingData: 'Veuillez sélectionner une photo et choisir un nom',
      uploadFailed: 'Échec du téléchargement'
    }
  },

  admin: {
    title: 'Accès Administrateur',
    subtitle: 'Entrez le mot de passe administrateur pour continuer',
    password: 'Entrez le mot de passe administrateur',
    login: 'Connexion',
    checking: 'Vérification...',
    invalidPassword: 'Mot de passe invalide. Veuillez réessayer.',
    demoPassword: 'Mot de passe de démonstration'
  },

  history: {
    title: 'Historique des Jeux',
    subtitle: 'Suivez vos sessions de jeu de photos de bébé',
    totalGames: 'Total des Jeux',
    avgPlayers: 'Moy. Joueurs',
    filters: {
      all: 'Tous les Jeux',
      recent: 'Récents (7 jours)',
      big: 'Gros Jeux (4+ joueurs)'
    },
    recentGames: 'Jeux Récents',
    topPlayers: 'Meilleurs Joueurs',
    gameDetails: 'Détails du Jeu',
    backToHistory: 'Retour à l\'Historique',
    gameInfo: 'Informations du Jeu',
    winner: 'Gagnant',
    finalScores: 'Scores Finaux',
    noGames: 'Aucun jeu joué pour le moment',
    noGamesSubtitle: 'Commencez un jeu pour le voir ici !',
    noDataAvailable: 'Aucune donnée disponible',
    loadingFromGithub: 'Chargement de l\'historique des jeux depuis GitHub...',
    errorLoading: 'Erreur lors du chargement de l\'historique des jeux',
    stats: {
      date: 'Date',
      duration: 'Durée',
      photosUsed: 'Photos Utilisées',
      totalRounds: 'Total des Tours',
      gameId: 'ID du Jeu',
      timePerPhoto: 'Temps par Photo',
      players: 'joueurs',
      photos: 'photos',
      unknownDate: 'Date inconnue',
      unknownDuration: 'Durée inconnue'
    }
  },

  game: {
    waiting: 'En attente du début du jeu...',
    round: 'Tour {{current}} sur {{total}}',
    timeLeft: 'Temps restant : {{seconds}}s',
    yourGuess: 'Votre supposition',
    submitGuess: 'Soumettre la Supposition',
    nextRound: 'Tour Suivant',
    gameOver: 'Jeu Terminé !',
    finalResults: 'Résultats Finaux',
    winner: 'Gagnant : {{name}}',
    yourScore: 'Votre Score : {{score}}'
  }
};