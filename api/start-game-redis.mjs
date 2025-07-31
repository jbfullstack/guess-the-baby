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
    const { selectedPhotos, timePerPhoto = 10} = req.body;

    if (!selectedPhotos || selectedPhotos.length === 0) {
      return res.status(400).json({ error: 'No photos selected for the game' });
    }

    // 1. Get players from Redis
    const players = await PlayersRedis.getPlayers();

    if (players.length === 0) {
      return res.status(400).json({ error: 'No players have joined the game yet' });
    }

    // 2. Create new game state
    const newGameId = Date.now().toString();
    const gameState = {
      gameId: newGameId,
      gameMode: 'playing',
      currentRound: 1,
      totalPhotos: selectedPhotos.length,
      currentPhoto: JSON.stringify({
        id: selectedPhotos[0].id,
        url: selectedPhotos[0].url
        // Don't include correct answer for security
      }),
      selectedPhotos: JSON.stringify(selectedPhotos),
      settings: JSON.stringify({ timePerPhoto }),
      startTime: Date.now(),
      startedAt: new Date().toISOString()
    };

    // 3. Save game state to Redis (ATOMIC!)
    await GameStateRedis.setCurrentGame(gameState);

    // 4. Initialize scores for all players
    const playerNames = players.map(p => p.name);
    console.log('[START] 🎯 About to initialize scores for:', playerNames);
    console.log('[START] 🔍 Player names type check:', playerNames.map(name => ({ name, type: typeof name, length: name?.length })));

    // Clear any existing scores first (CRITICAL FIX)
    await ScoresRedis.resetScores();
    console.log('[START] 🧹 Cleared existing scores');

    // Initialize with validation
    const initializedScores = await ScoresRedis.initializeScores(playerNames);
    console.log('[START] ✅ Scores initialized:', initializedScores);

    // Double-check what's actually in Redis
    const verificationScores = await ScoresRedis.getScores();
    console.log('[START] 🔍 Redis verification:', verificationScores);

    if (Object.keys(verificationScores).some(key => /^[0-9]+$/.test(key))) {
      console.error('[START] 🚨 GHOST PLAYERS DETECTED AFTER INITIALIZATION!');
      console.error('[START] 🚨 Expected:', playerNames);
      console.error('[START] 🚨 Got:', Object.keys(verificationScores));
      
      // Emergency cleanup
      await ScoresRedis.resetScores();
      throw new Error('Ghost players detected during score initialization');
    }

    // 5. Set up vote counting for round 1
    await VotesRedis.setTotalPlayers(1, players.length);

    // 6. Notify all clients that the game has started
    await pusher.trigger('baby-game', 'game-started', {
      gameId: newGameId,
      photo: {
        id: selectedPhotos[0].id,
        url: selectedPhotos[0].url
      },
      settings: { timePerPhoto },
      totalPhotos: selectedPhotos.length,
      currentRound: 1,
      players: players,
      gameMode: 'playing'
    });

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Game started successfully',
      gameId: newGameId,
      totalPhotos: selectedPhotos.length,
      playersCount: players.length,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}