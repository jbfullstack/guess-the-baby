export default {
  common: {
    buttons: {
      back: 'Back',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      confirm: 'Confirm',
      loading: 'Loading...',
      refresh: 'Refresh',
      upload: 'Upload',
      submit: 'Submit',
      close: 'Close'
    },
    labels: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort'
    },
    messages: {
      success: 'Success!',
      error: 'An error occurred',
      noData: 'No data available',
      loading: 'Loading...',
      saved: 'Saved successfully'
    }
  },
  
  nav: {
    home: 'Home',
    game: 'Game',
    admin: 'Admin Panel',
    history: 'Game History',
    upload: 'Upload Photo'
  },

  home: {
    title: 'Baby Photo Game',
    subtitle: 'Guess who\'s who in these adorable baby photos!',
    buttons: {
      uploadPhoto: 'Upload Photo',
      joinGame: 'Join Game',
      adminPanel: 'Admin Panel',
      gameHistory: 'Game History'
    }
  },

  upload: {
    title: 'Upload Your Baby Photo',
    dragDrop: 'Click to upload baby photo',
    fileInfo: 'Max 5MB • JPG, PNG, GIF',
    whoIsThis: 'Who is in this photo?',
    addNewPerson: '+ Add new person',
    enterName: 'Enter person\'s name',
    uploadSuccess: 'Upload Successful!',
    uploadSuccessMessage: 'Your baby photo has been added to the game.',
    uploadButton: 'Upload Photo',
    uploading: 'Uploading...',
    tip: '💡 Tip: Clear, well-lit baby photos work best for the game!',
    errors: {
      fileTooLarge: 'File size must be less than 5MB',
      invalidFileType: 'Please select an image file',
      missingData: 'Please select a photo and choose a name',
      uploadFailed: 'Upload failed'
    }
  },

  admin: {
    title: 'Admin Access',
    subtitle: 'Enter the admin password to continue',
    password: 'Enter admin password',
    login: 'Login',
    checking: 'Checking...',
    invalidPassword: 'Invalid password. Please try again.',
    demoPassword: 'Demo password'
  },

  history: {
    title: 'Game History',
    subtitle: 'Track your baby photo game sessions',
    totalGames: 'Total Games',
    avgPlayers: 'Avg Players',
    filters: {
      all: 'All Games',
      recent: 'Recent (7 days)',
      big: 'Big Games (4+ players)'
    },
    recentGames: 'Recent Games',
    topPlayers: 'Top Players',
    gameDetails: 'Game Details',
    backToHistory: 'Back to History',
    gameInfo: 'Game Information',
    winner: 'Winner',
    finalScores: 'Final Scores',
    noGames: 'No games played yet',
    noGamesSubtitle: 'Start a game to see it here!',
    noDataAvailable: 'No data available',
    loadingFromGithub: 'Loading game history from GitHub...',
    errorLoading: 'Error loading game history',
    stats: {
      date: 'Date',
      duration: 'Duration',
      photosUsed: 'Photos Used',
      totalRounds: 'Total Rounds',
      gameId: 'Game ID',
      timePerPhoto: 'Time per Photo',
      players: 'players',
      photos: 'photos',
      unknownDate: 'Unknown date',
      unknownDuration: 'Unknown duration'
    }
  },

  game: {
    // Add game-specific translations
    waiting: 'Waiting for game to start...',
    round: 'Round {{current}} of {{total}}',
    timeLeft: 'Time left: {{seconds}}s',
    yourGuess: 'Your guess',
    submitGuess: 'Submit Guess',
    nextRound: 'Next Round',
    gameOver: 'Game Over!',
    finalResults: 'Final Results',
    winner: 'Winner: {{name}}',
    yourScore: 'Your Score: {{score}}'
  }
};
