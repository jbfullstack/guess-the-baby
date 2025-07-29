import Pusher from 'pusher';
import { PlayersRedis, ScoresRedis, GameStateRedis } from '../src/services/redis.js';
import { Octokit } from '@octokit/rest';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Helper to get real names from GitHub
async function getRealNamesFromGitHub() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
    });
    const gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    console.log('✅ Real names loaded from GitHub:', gameData.names);
    return gameData.names || ['Alice', 'Bob', 'Charlie', 'Diana']; // Fallback to mock if no real names
  } catch (error) {
    console.warn('❌ Failed to load real names from GitHub:', error.message);
    return ['Alice', 'Bob', 'Charlie', 'Diana']; // Fallback to mock names
  }
}

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

    console.log(`🎮 Player "${playerName}" attempting to join...`);

    // 1. Get current game state from Redis (FAST!)
    const gameState = await GameStateRedis.getCurrentGame();
    console.log('Game state loaded:', gameState.gameMode);
    
    // 2. Add player to Redis (ATOMIC!)
    const newPlayer = {
      name: playerName.trim(),
      id: Date.now().toString(),
      score: 0
    };

    console.log('Adding player to Redis...');
    await PlayersRedis.addPlayer(newPlayer);
    console.log('Player added successfully');
    
    // 3. Initialize score in Redis
    await ScoresRedis.setScore(newPlayer.name, 0);
    console.log('Score initialized');
    
    // 4. Update heartbeat
    await PlayersRedis.updateHeartbeat(newPlayer.name);
    console.log('Heartbeat updated');

    // 5. Get updated data + REAL NAMES
    const [allPlayers, allScores, realNames] = await Promise.all([
      PlayersRedis.getPlayers(),
      ScoresRedis.getScores(),
      getRealNamesFromGitHub() // NOUVEAU : Charge les vrais noms
    ]);
    
    console.log(`Total players now: ${allPlayers.length}`);
    console.log(`Real names loaded: ${realNames.length} names:`, realNames);

    // 6. Notify all clients via Pusher
    await pusher.trigger('baby-game', 'player-joined', {
      player: newPlayer,
      totalPlayers: allPlayers.length,
      allPlayers: allPlayers,
      names: realNames, // NOUVEAU : Inclut les vrais noms
      gameState: {
        gameMode: gameState.gameMode,
        gameId: gameState.gameId
      }
    });
    console.log('Pusher notification sent with real names');

    // 7. Send sync state to new player
    await pusher.trigger('baby-game', 'sync-state', {
      targetPlayer: newPlayer.name,
      gameState: {
        players: allPlayers,
        gameMode: gameState.gameMode,
        gameId: gameState.gameId,
        scores: allScores,
        names: realNames, // NOUVEAU : Inclut les vrais noms
        currentRound: parseInt(gameState.currentRound) || 0,
        currentPhoto: gameState.currentPhoto ? JSON.parse(gameState.currentPhoto) : null
      }
    });
    console.log('Sync state sent with real names');

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Joined game successfully',
      gameId: gameState.gameId,
      gameMode: gameState.gameMode,
      totalPlayers: allPlayers.length,
      players: allPlayers,
      scores: allScores,
      names: realNames, // NOUVEAU : Inclut les vrais noms dans la réponse
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('Join game error:', error);
    
    // Handle specific Redis errors
    if (error.message.includes('already taken')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('JSON')) {
      return res.status(500).json({
        error: 'Redis data corruption detected. Please run cleanup.',
        details: error.message,
        solution: 'POST to /api/redis-cleanup to fix',
        responseTime: `${Date.now() - startTime}ms`
      });
    }
    
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}