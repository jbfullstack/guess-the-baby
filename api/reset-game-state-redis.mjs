import Pusher from 'pusher';
import { GameStateRedis, PlayersRedis, ScoresRedis, VotesRedis } from '../src/services/redis.js';

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
    const { resetType = 'hard' } = req.body;

    console.log(`🔄 Resetting game (${resetType})...`);

    // Reset all Redis data (FAST & ATOMIC!)
    await GameStateRedis.resetGame();

    let message;
    if (resetType === 'hard') {
      // Clear everything including players
      await Promise.all([
        PlayersRedis.removePlayer('*'), // This will be handled by the reset
        ScoresRedis.resetScores()
      ]);
      message = 'Game reset completely - all players and scores cleared';
    } else {
      // Soft reset - keep players but reset game state
      const players = await PlayersRedis.getPlayers();
      await ScoresRedis.initializeScores(players.map(p => p.name));
      message = 'Game reset - players kept but scores reset';
    }

    // Notify all clients that game has been reset
    await pusher.trigger('baby-game', 'game-reset', {
      resetType,
      message,
      timestamp: Date.now()
    });

    const responseTime = Date.now() - startTime;

    console.log(`✅ Game reset completed in ${responseTime}ms`);

    res.json({ 
      success: true,
      message: `Game reset successfully (${resetType})`,
      resetType,
      responseTime: `${responseTime}ms`,
      clearedData: resetType === 'hard' 
        ? ['gameState', 'players', 'scores', 'votes']
        : ['gameState', 'scores', 'votes']
    });

  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}