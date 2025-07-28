import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Simple in-memory game state (in production, use Redis or database)
let currentGame = {
  id: null,
  players: [],
  isActive: false,
  currentPhoto: null,
  votes: {},
  scores: {},
  settings: { timePerPhoto: 10, autoNext: true },
  selectedPhotos: []
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerName } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const trimmedName = playerName.trim();

    // Create game if doesn't exist
    if (!currentGame.id) {
      currentGame.id = Date.now().toString();
    }

    // Check if player already joined
    const existingPlayer = currentGame.players.find(p => p.name === trimmedName);
    if (existingPlayer) {
      return res.json({ 
        gameId: currentGame.id, 
        message: 'Already joined',
        success: true 
      });
    }

    // Add player
    const player = {
      name: trimmedName,
      joinedAt: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    currentGame.players.push(player);
    currentGame.scores[trimmedName] = 0;

    // Notify all clients
    await pusher.trigger('baby-game', 'player-joined', {
      player,
      players: currentGame.players,
      totalPlayers: currentGame.players.length,
    });

    res.json({ 
      gameId: currentGame.id,
      success: true,
      message: 'Joined game successfully',
      players: currentGame.players
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Export current game state for other API functions
export { currentGame };