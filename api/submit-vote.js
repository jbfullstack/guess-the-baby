import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Shared game state
let currentGame = {
  id: Date.now().toString(),
  players: [],
  isActive: false,
  currentPhoto: null,
  votes: {},
  scores: {},
  selectedPhotos: []
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameId, playerName, answer } = req.body;

    if (!currentGame.isActive) {
      return res.status(400).json({ error: 'Game is not currently active' });
    }

    if (!playerName || !answer) {
      return res.status(400).json({ error: 'Player name and answer are required' });
    }

    // Check if player exists in the game
    const player = currentGame.players.find(p => p.name === playerName);
    if (!player) {
      return res.status(400).json({ error: 'Player not found in current game' });
    }

    // Check if player already voted this round
    if (currentGame.votes[playerName]) {
      return res.status(400).json({ error: 'You have already voted for this photo' });
    }

    // Record vote
    currentGame.votes[playerName] = answer;

    // Notify admin about the vote (for live tracking)
    await pusher.trigger('baby-game', 'vote-submitted', {
      player: playerName,
      answer,
      hasVoted: true,
      totalVotes: Object.keys(currentGame.votes).length,
      totalPlayers: currentGame.players.length,
      votes: Object.entries(currentGame.votes).map(([name, ans]) => ({
        player: name,
        answer: ans,
        correct: ans === currentGame.currentPhoto?.person
      }))
    });

    // Check if all players have voted
    if (Object.keys(currentGame.votes).length === currentGame.players.length) {
      // All players voted, advance immediately (after small delay)
      setTimeout(async () => {
        if (currentGame.isActive) {
          await handleNextPhoto();
        }
      }, 1000);
    }

    res.json({ 
      success: true,
      message: 'Vote submitted successfully',
      votesReceived: Object.keys(currentGame.votes).length,
      totalPlayers: currentGame.players.length
    });

  } catch (error) {
    console.error('Submit vote error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper function (same as in start-game.js)
async function handleNextPhoto() {
  if (!currentGame.isActive) return;

  const currentPhoto = currentGame.selectedPhotos[currentGame.currentPhotoIndex];
  
  // Calculate scores for this round
  Object.entries(currentGame.votes).forEach(([playerName, answer]) => {
    if (answer === currentPhoto.person) {
      currentGame.scores[playerName] = (currentGame.scores[playerName] || 0) + 1;
    }
  });

  // Show results
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

  // Continue to next photo or end game
  setTimeout(async () => {
    currentGame.currentPhotoIndex++;
    currentGame.votes = {};

    if (currentGame.currentPhotoIndex >= currentGame.selectedPhotos.length) {
      // Game ended
      currentGame.isActive = false;
      
      const winner = Object.entries(currentGame.scores).reduce((a, b) => 
        currentGame.scores[a[0]] > currentGame.scores[b[0]] ? a : b
      );

      await pusher.trigger('baby-game', 'game-ended', {
        winner: winner[0],
        finalScores: currentGame.scores,
        gameId: currentGame.id,
      });

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

      // Auto-advance timer for next round
      if (currentGame.settings.autoNext) {
        setTimeout(async () => {
          await handleNextPhoto();
        }, currentGame.settings.timePerPhoto * 1000);
      }
    }
  }, 3000);
}