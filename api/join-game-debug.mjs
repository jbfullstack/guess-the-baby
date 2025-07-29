import Pusher from 'pusher';
import { PlayersRedis, ScoresRedis, GameStateRedis } from '../src/services/redis.js';
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
  const debugInfo = [];

  try {
    const { playerName } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    debugInfo.push(`🎮 Player "${playerName}" attempting to join...`);

    // 1. Check what's currently in Redis
    debugInfo.push('🔍 Checking current Redis state...');
    const rawPlayers = await redis.lrange('game:players', 0, -1);
    debugInfo.push(`Raw players from Redis (${rawPlayers.length} entries):`);
    
    rawPlayers.forEach((player, index) => {
      debugInfo.push(`  [${index}] Type: ${typeof player}, Value: ${JSON.stringify(player)}`);
    });

    // 2. Try to get players using our service
    debugInfo.push('📋 Trying to get players via PlayersRedis...');
    
    let currentPlayers = [];
    try {
      currentPlayers = await PlayersRedis.getPlayers();
      debugInfo.push(`✅ Successfully got ${currentPlayers.length} players`);
      currentPlayers.forEach((player, index) => {
        debugInfo.push(`  Player ${index}: ${JSON.stringify(player)}`);
      });
    } catch (playersError) {
      debugInfo.push(`❌ Error getting players: ${playersError.message}`);
      
      // If error, clear corrupted data and start fresh
      debugInfo.push('🧹 Clearing corrupted player data...');
      await redis.del('game:players');
      currentPlayers = [];
      debugInfo.push('✅ Player data cleared, starting fresh');
    }

    // 3. Check if player already exists
    const exists = currentPlayers.find(p => p && p.name === playerName.trim());
    if (exists) {
      return res.status(400).json({ 
        error: 'Player name already taken',
        debugInfo: debugInfo
      });
    }

    // 4. Add new player
    debugInfo.push('➕ Adding new player...');
    const newPlayer = {
      name: playerName.trim(),
      id: Date.now().toString(),
      score: 0,
      joinedAt: new Date().toISOString(),
      lastSeen: Date.now()
    };

    debugInfo.push(`New player data: ${JSON.stringify(newPlayer)}`);

    // Store as JSON string (EXPLICIT)
    const playerJson = JSON.stringify(newPlayer);
    debugInfo.push(`Storing as JSON: ${playerJson}`);
    
    await redis.lpush('game:players', playerJson);
    await redis.expire('game:players', 7200);
    debugInfo.push('✅ Player stored in Redis');

    // 5. Verify storage
    const verifyPlayers = await redis.lrange('game:players', 0, -1);
    debugInfo.push(`🔍 Verification - Redis now contains ${verifyPlayers.length} entries:`);
    verifyPlayers.forEach((player, index) => {
      debugInfo.push(`  [${index}] Type: ${typeof player}, Value: ${JSON.stringify(player)}`);
    });

    // 6. Get final player list
    const finalPlayers = await PlayersRedis.getPlayers();
    debugInfo.push(`✅ Final player list: ${finalPlayers.length} players`);

    // 7. Initialize score
    await ScoresRedis.setScore(newPlayer.name, 0);
    debugInfo.push('✅ Score initialized');

    // 8. Get game state
    const gameState = await GameStateRedis.getCurrentGame();
    debugInfo.push(`✅ Game state loaded: ${gameState.gameMode}`);

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Joined game successfully (DEBUG MODE)',
      gameId: gameState.gameId,
      gameMode: gameState.gameMode,
      totalPlayers: finalPlayers.length,
      players: finalPlayers,
      responseTime: `${responseTime}ms`,
      debugInfo: debugInfo
    });

  } catch (error) {
    console.error('Join game debug error:', error);
    debugInfo.push(`❌ FINAL ERROR: ${error.message}`);
    debugInfo.push(`❌ STACK: ${error.stack}`);
    
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      debugInfo: debugInfo
    });
  }
}