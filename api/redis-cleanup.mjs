import { GameStateRedis, PlayersRedis, ScoresRedis, VotesRedis, RedisHealth } from '../src/services/redis.js';
import redis from '../src/services/redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    console.log('🧹 Starting Redis cleanup...');

    // Get current state before cleanup
    let beforeState = {};
    try {
      beforeState = {
        gameState: await GameStateRedis.getCurrentGame(),
        players: await PlayersRedis.getPlayers(),
        scores: await ScoresRedis.getScores()
      };
    } catch (error) {
      console.warn('Error getting before state:', error);
      beforeState = { error: error.message };
    }

    // Clear everything
    const cleanupResults = [];

    // 1. Clear game state
    try {
      await GameStateRedis.resetGame();
      cleanupResults.push({ action: 'Reset game state', status: 'SUCCESS' });
    } catch (error) {
      cleanupResults.push({ action: 'Reset game state', status: 'ERROR', error: error.message });
    }

    // 2. Clear players (force delete)
    try {
      await redis.del('game:players');
      cleanupResults.push({ action: 'Clear players', status: 'SUCCESS' });
    } catch (error) {
      cleanupResults.push({ action: 'Clear players', status: 'ERROR', error: error.message });
    }

    // 3. Clear scores
    try {
      await ScoresRedis.resetScores();
      cleanupResults.push({ action: 'Reset scores', status: 'SUCCESS' });
    } catch (error) {
      cleanupResults.push({ action: 'Reset scores', status: 'ERROR', error: error.message });
    }

    // 4. Clear votes (all rounds)
    try {
      const pipeline = redis.pipeline();
      for (let i = 1; i <= 20; i++) {
        pipeline.del(`game:votes:round:${i}`);
      }
      await pipeline.exec();
      cleanupResults.push({ action: 'Clear all votes', status: 'SUCCESS' });
    } catch (error) {
      cleanupResults.push({ action: 'Clear all votes', status: 'ERROR', error: error.message });
    }

    // 5. Clear online players
    try {
      await redis.del('players:online');
      cleanupResults.push({ action: 'Clear online players', status: 'SUCCESS' });
    } catch (error) {
      cleanupResults.push({ action: 'Clear online players', status: 'ERROR', error: error.message });
    }

    // Verify cleanup
    let afterState = {};
    try {
      afterState = {
        gameState: await GameStateRedis.getCurrentGame(),
        players: await PlayersRedis.getPlayers(),
        scores: await ScoresRedis.getScores()
      };
    } catch (error) {
      console.warn('Error getting after state:', error);
      afterState = { error: error.message };
    }

    // Health check
    const healthCheck = await RedisHealth.ping();

    const responseTime = Date.now() - startTime;

    console.log(`✅ Redis cleanup completed in ${responseTime}ms`);

    res.json({
      success: true,
      message: 'Redis cleaned up successfully',
      responseTime: `${responseTime}ms`,
      cleanupResults,
      beforeState,
      afterState,
      healthCheck,
      nextSteps: [
        '1. Try joining a game now',
        '2. Check that admin panel shows players correctly',
        '3. Test the complete game flow'
      ]
    });

  } catch (error) {
    console.error('Redis cleanup error:', error);
    res.status(500).json({
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}