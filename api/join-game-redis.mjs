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
    return gameData.names || []; // Fallback to mock if no real names
  } catch (error) {
    console.warn('❌ Failed to load real names from GitHub:', error.message);
    return []; // Fallback to mock names
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { playerName, rejoin = false } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    console.log(`🎮 Player "${playerName}" attempting to join... Rejoin: ${rejoin}`);

    // 1. Get current game state from Redis (FAST!)
    const gameState = await GameStateRedis.getCurrentGame();
    console.log('Game state loaded:', gameState.gameMode);
    
    // 2. Check if player already exists BEFORE trying to add
    const allPlayers = await PlayersRedis.getPlayers();
    const existingPlayer = allPlayers.find(p => p && p.name === playerName.trim());
    
    if (existingPlayer) {
      if (rejoin) {
        console.log(`🔄 Player "${playerName}" rejoining game...`);
        
        // Update heartbeat for rejoining player
        await PlayersRedis.updateHeartbeat(playerName.trim());
        console.log('Heartbeat updated for rejoining player');
        
        // Get updated data for rejoin response
        const [updatedPlayers, allScores, realNames] = await Promise.all([
          PlayersRedis.getPlayers(),
          ScoresRedis.getScores(),
          getRealNamesFromGitHub()
        ]);
        
        // Notify other players that this player rejoined
        await pusher.trigger('baby-game', 'player-rejoined', {
          player: existingPlayer,
          totalPlayers: updatedPlayers.length,
          allPlayers: updatedPlayers,
          names: realNames,
          gameState: {
            gameMode: gameState.gameMode,
            gameId: gameState.gameId
          }
        });
        console.log('Pusher notification sent for rejoin');

        // Send sync state to rejoining player
        // 🚨 IMPORTANT: currentPhoto is ALREADY parsed by Redis service - don't JSON.parse again!
        await pusher.trigger('baby-game', 'sync-state', {
          targetPlayer: playerName.trim(),
          gameState: {
            players: updatedPlayers,
            gameMode: gameState.gameMode,
            gameId: gameState.gameId,
            scores: allScores,
            names: realNames,
            currentRound: parseInt(gameState.currentRound) || 0,
            currentPhoto: gameState.currentPhoto  // Already parsed - use directly!
          }
        });
        console.log('Sync state sent to rejoining player');

        const responseTime = Date.now() - startTime;

        return res.json({ 
          success: true,
          message: 'Rejoined game successfully',
          gameId: gameState.gameId,
          gameMode: gameState.gameMode,
          totalPlayers: updatedPlayers.length,
          players: updatedPlayers,
          scores: allScores,
          names: realNames,
          rejoined: true,
          responseTime: `${responseTime}ms`
        });
        
      } else {
        // Player exists but not trying to rejoin
        return res.status(400).json({ 
          error: 'Player name already taken',
          suggestion: 'Use a different name or click "Rejoin" if this is your session'
        });
      }
    }

    // 3. NORMAL JOIN FLOW - Player doesn't exist, proceed with original logic
    console.log('New player joining...');
    
    const newPlayer = {
      name: playerName.trim(),
      id: Date.now().toString(),
      score: 0
    };

    console.log('Adding player to Redis...');
    await PlayersRedis.addPlayer(newPlayer);
    console.log('Player added successfully');
    
    // 4. Initialize score in Redis
    await ScoresRedis.setScore(newPlayer.name, 0);
    console.log('Score initialized');
    
    // 5. Update heartbeat
    await PlayersRedis.updateHeartbeat(newPlayer.name);
    console.log('Heartbeat updated');

    // 6. Get updated data + REAL NAMES
    const [finalPlayers, finalScores, realNames] = await Promise.all([
      PlayersRedis.getPlayers(),
      ScoresRedis.getScores(),
      getRealNamesFromGitHub()
    ]);
    
    console.log(`Total players now: ${finalPlayers.length}`);
    console.log(`Real names loaded: ${realNames.length} names:`, realNames);

    // 7. Notify all clients via Pusher
    await pusher.trigger('baby-game', 'player-joined', {
      player: newPlayer,
      totalPlayers: finalPlayers.length,
      allPlayers: finalPlayers,
      names: realNames,
      gameState: {
        gameMode: gameState.gameMode,
        gameId: gameState.gameId
      }
    });
    console.log('Pusher notification sent with real names');

    // 8. Send sync state to new player
    // 🚨 IMPORTANT: currentPhoto is ALREADY parsed - don't JSON.parse again!
    await pusher.trigger('baby-game', 'sync-state', {
      targetPlayer: newPlayer.name,
      gameState: {
        players: finalPlayers,
        gameMode: gameState.gameMode,
        gameId: gameState.gameId,
        scores: finalScores,
        names: realNames,
        currentRound: parseInt(gameState.currentRound) || 0,
        currentPhoto: gameState.currentPhoto  // Already parsed - use directly!
      }
    });
    console.log('Sync state sent with real names');

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Joined game successfully',
      gameId: gameState.gameId,
      gameMode: gameState.gameMode,
      totalPlayers: finalPlayers.length,
      players: finalPlayers,
      scores: finalScores,
      names: realNames,
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