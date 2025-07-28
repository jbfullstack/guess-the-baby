import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Import shared game state
let currentGame = {
  id: Date.now().toString(),
  players: [],
  isActive: false,
  currentPhoto: null,
  currentPhotoIndex: 0,
  votes: {},
  scores: {},
  photos: [],
  settings: { timePerPhoto: 10, autoNext: true },
  selectedPhotos: []
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { settings, selectedPhotos } = req.body;

    if (currentGame.players.length === 0) {
      return res.status(400).json({ error: 'No players have joined the game' });
    }

    if (!selectedPhotos || selectedPhotos.length === 0) {
      return res.status(400).json({ error: 'No photos selected for the game' });
    }

    // Update game settings and photos
    currentGame.settings = { ...currentGame.settings, ...settings };
    currentGame.selectedPhotos = selectedPhotos;
    currentGame.isActive = true;
    currentGame.currentPhotoIndex = 0;
    currentGame.votes = {};
    
    // Reset scores for all players
    currentGame.players.forEach(player => {
      currentGame.scores[player.name] = 0;
    });

    // Get first photo
    const firstPhoto = selectedPhotos[0];
    currentGame.currentPhoto = firstPhoto;

    // Notify all clients that game started
    await pusher.trigger('baby-game', 'game-started', {
      gameId: currentGame.id,
      photo: {
        ...firstPhoto,
        correctAnswer: undefined, // Don't send correct answer to clients
      },
      settings: currentGame.settings,
      totalPhotos: selectedPhotos.length,
      currentRound: 1,
    });

    // Auto-advance timer (if enabled)
    if (currentGame.settings.autoNext) {
      setTimeout(async () => {
        await handleNextPhoto();
      }, currentGame.settings.timePerPhoto * 1000);
    }

    res.json({ 
      success: true,
      gameId: currentGame.id,
      message: 'Game started successfully',
      totalPhotos: selectedPhotos.length
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper function for advancing photos
async function handleNextPhoto() {
  if (!currentGame.isActive) return;

  const currentPhoto = currentGame.selectedPhotos[currentGame.currentPhotoIndex];
  
  // Calculate scores for this round
  Object.entries(currentGame.votes).forEach(([playerName, answer]) => {
    if (answer === currentPhoto.person) {
      currentGame.scores[playerName] = (currentGame.scores[playerName] || 0) + 1;
    }
  });

  // Show results to all players
  const results = {
    correctAnswer: currentPhoto.person,
    votes: Object.entries(currentGame.votes).map(([playerName, answer]) => ({
      player: playerName,
      answer,
      correct: answer === currentPhoto.person,
    })),
    scores: currentGame.scores,
    round: currentGame.currentPhotoIndex + 1,
  };

  await pusher.trigger('baby-game', 'round-ended', results);

  // Wait 3 seconds then next photo or end game
  setTimeout(async () => {
    currentGame.currentPhotoIndex++;
    currentGame.votes = {};

    if (currentGame.currentPhotoIndex >= currentGame.selectedPhotos.length) {
      // Game ended
      currentGame.isActive = false;
      
      const winner = Object.entries(currentGame.scores).reduce((a, b) => 
        currentGame.scores[a[0]] > currentGame.scores[b[0]] ? a : b
      );

      const gameResult = {
        winner: winner[0],
        finalScores: currentGame.scores,
        gameId: currentGame.id,
        totalRounds: currentGame.selectedPhotos.length,
        players: currentGame.players.map(p => ({
          name: p.name,
          score: currentGame.scores[p.name] || 0
        }))
      };

      await pusher.trigger('baby-game', 'game-ended', gameResult);

      // Save to history (you can implement this)
      console.log('Game ended:', gameResult);

    } else {
      // Next photo
      const nextPhoto = currentGame.selectedPhotos[currentGame.currentPhotoIndex];
      currentGame.currentPhoto = nextPhoto;

      await pusher.trigger('baby-game', 'next-photo', {
        photo: {
          ...nextPhoto,
          correctAnswer: undefined,
        },
        round: currentGame.currentPhotoIndex + 1,
        totalPhotos: currentGame.selectedPhotos.length,
      });

      // Set timer for next photo
      if (currentGame.settings.autoNext) {
        setTimeout(async () => {
          await handleNextPhoto();
        }, currentGame.settings.timePerPhoto * 1000);
      }
    }
  }, 3000);
}

export { currentGame };