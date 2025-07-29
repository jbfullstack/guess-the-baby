import Pusher from 'pusher';
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

// Helper to load current game state
async function loadGameState() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'currentGame.json',
    });
    return JSON.parse(Buffer.from(data.content, 'base64').toString());
  } catch (error) {
    // File doesn't exist, return default state
    return {
      gameId: null,
      players: [],
      gameMode: 'waiting',
      currentPhoto: null,
      scores: {},
      settings: { timePerPhoto: 10, autoNext: true },
      selectedPhotos: [],
      currentRound: 0,
      createdAt: new Date().toISOString()
    };
  }
}

// Helper to save game state
async function saveGameState(gameState) {
  try {
    let sha;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'currentGame.json',
      });
      sha = existingFile.sha;
    } catch (error) {
      // File doesn't exist yet
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'currentGame.json',
      message: 'Update game state',
      content: Buffer.from(JSON.stringify(gameState, null, 2)).toString('base64'),
      sha
    });
  } catch (error) {
    console.error('Failed to save game state:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerName } = req.body;

    if (!playerName || !playerName.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Load current game state
    const gameState = await loadGameState();
    
    // Check if player already exists
    const existingPlayer = gameState.players.find(p => p.name === playerName.trim());
    if (existingPlayer) {
      return res.status(400).json({ error: 'Player name already taken' });
    }

    // Add new player
    const newPlayer = {
      name: playerName.trim(),
      id: Date.now().toString(),
      joinedAt: new Date().toISOString(),
      score: 0
    };

    gameState.players.push(newPlayer);
    gameState.scores[newPlayer.name] = 0;

    // Save updated state
    await saveGameState(gameState);

    // Notify all clients via Pusher
    await pusher.trigger('baby-game', 'player-joined', {
      player: newPlayer,
      totalPlayers: gameState.players.length,
      allPlayers: gameState.players,
      gameState: {
        gameMode: gameState.gameMode,
        gameId: gameState.gameId
      }
    });

    // Send current game state to the new player specifically
    await pusher.trigger('baby-game', 'sync-state', {
      targetPlayer: newPlayer.name,
      gameState: {
        players: gameState.players,
        gameMode: gameState.gameMode,
        gameId: gameState.gameId,
        scores: gameState.scores,
        currentRound: gameState.currentRound,
        currentPhoto: gameState.gameMode === 'playing' && gameState.selectedPhotos[gameState.currentRound - 1] 
          ? {
              id: gameState.selectedPhotos[gameState.currentRound - 1].id,
              url: gameState.selectedPhotos[gameState.currentRound - 1].url
            }
          : null
      }
    });

    res.json({ 
      success: true,
      message: 'Joined game successfully',
      gameId: gameState.gameId,
      gameMode: gameState.gameMode,
      totalPlayers: gameState.players.length,
      players: gameState.players,
      scores: gameState.scores
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: error.message });
  }
}