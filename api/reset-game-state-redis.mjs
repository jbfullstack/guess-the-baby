import Pusher from 'pusher';
import { GameStateRedis, PlayersRedis, ScoresRedis, VotesRedis } from '../src/services/redis.js';
import redis from '../src/services/redis.js';

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
    const { resetType = 'hard', playerName, action } = req.body;

    console.log(`[API] Reset/Remove request:`, { resetType, playerName, action });

    // REMOVE SINGLE PLAYER
    if (action === 'removePlayer' && playerName) {
      console.log(`[API] 🚪 Removing player: ${playerName}`);

      try {
        // Remove player from Redis
        const updatedPlayers = await PlayersRedis.removePlayer(playerName);
        
        // Remove player score - fix the undefined issue
        const currentScores = await ScoresRedis.getScores();
        delete currentScores[playerName];
        
        // Reset scores without the removed player
        await ScoresRedis.resetScores();
        if (Object.keys(currentScores).length > 0) {
          const pipeline = redis.pipeline();
          Object.entries(currentScores).forEach(([name, score]) => {
            pipeline.hset('game:scores', name, score);
          });
          await pipeline.exec();
        }

        // Notify all clients that player left
        await pusher.trigger('baby-game', 'player-left', {
          playerName: playerName,
          remainingPlayers: updatedPlayers,
          totalPlayers: updatedPlayers.length,
          scores: currentScores,
          timestamp: Date.now()
        });

        const responseTime = Date.now() - startTime;

        console.log(`[API] ✅ Player ${playerName} removed successfully`);

        return res.json({ 
          success: true,
          action: 'removePlayer',
          message: `Player ${playerName} removed successfully`,
          playerName: playerName,
          remainingPlayers: updatedPlayers.length,
          responseTime: `${responseTime}ms`
        });

      } catch (error) {
        console.error('[API] ❌ Remove player error:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to remove player: ${error.message}`,
          responseTime: `${Date.now() - startTime}ms`
        });
      }
    }

    // FULL GAME RESET (original functionality)
    console.log(`[API] 🔄 Resetting game (${resetType})...`);

    // Reset all Redis data (FAST & ATOMIC!)
    await GameStateRedis.resetGame();

    let message;
    if (resetType === 'hard') {
      // Clear everything including players
      await Promise.all([
        PlayersRedis.clearAllPlayers(),
        ScoresRedis.resetScores()
      ]);
      message = 'Game reset completely - all players and scores cleared';
    } else {
      // Soft reset - keep players but reset game state
      const players = await PlayersRedis.getPlayers();
      if (players.length > 0) {
        await ScoresRedis.initializeScores(players.map(p => p.name));
      }
      message = 'Game reset - players kept but scores reset';
    }

    // Notify all clients that game has been reset
    await pusher.trigger('baby-game', 'game-reset', {
      resetType,
      message,
      timestamp: Date.now()
    });

    const responseTime = Date.now() - startTime;

    console.log(`[API] ✅ Game reset completed in ${responseTime}ms`);

    res.json({ 
      success: true,
      action: 'resetGame',
      message: `Game reset successfully (${resetType})`,
      resetType,
      responseTime: `${responseTime}ms`,
      clearedData: resetType === 'hard' 
        ? ['gameState', 'players', 'scores', 'votes']
        : ['gameState', 'scores', 'votes']
    });

  } catch (error) {
    console.error('[API] ❌ Reset/Remove operation error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}