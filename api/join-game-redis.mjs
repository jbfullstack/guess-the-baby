import Pusher from 'pusher';
import { PlayersRedis, ScoresRedis, GameStateRedis } from '../src/services/redis.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { playerName } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // 1. Get current game state from Redis (FAST!)
    const gameState = await GameStateRedis.getCurrentGame();
    
    // 2. Add player to Redis (ATOMIC!)
    const newPlayer = {
      name: playerName.trim(),
      id: Date.now().toString(),
      score: 0
    };

    await PlayersRedis.addPlayer(newPlayer);
    
    // 3. Initialize score in Redis
    await ScoresRedis.setScore(newPlayer.name, 0);
    
    // 4. Update heartbeat
    await PlayersRedis.updateHeartbeat(newPlayer.name);

    // 5. Get updated data
    const [allPlayers, allScores] = await Promise.all([
      PlayersRedis.getPlayers(),
      ScoresRedis.getScores()
    ]);

    // 6. Notify all clients via Pusher
    await pusher.trigger('baby-game', 'player-joined', {
      player: newPlayer,
      totalPlayers: allPlayers.length,
      allPlayers: allPlayers,
      gameState: {
        gameMode: gameState.gameMode,
        gameId: gameState.gameId
      }
    });

    // 7. Send sync state to new player
    await pusher.trigger('baby-game', 'sync-state', {
      targetPlayer: newPlayer.name,
      gameState: {
        players: allPlayers,
        gameMode: gameState.gameMode,
        gameId: gameState.gameId,
        scores: allScores,
        currentRound: parseInt(gameState.currentRound) || 0,
        currentPhoto: gameState.currentPhoto ? JSON.parse(gameState.currentPhoto) : null
      }
    });

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Joined game successfully',
      gameId: gameState.gameId,
      gameMode: gameState.gameMode,
      totalPlayers: allPlayers.length,
      players: allPlayers,
      scores: allScores,
      responseTime: `${responseTime}ms` // Pour voir la différence de vitesse !
    });

  } catch (error) {
    console.error('Join game error:', error);
    
    // Handle specific Redis errors
    if (error.message.includes('already taken')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}