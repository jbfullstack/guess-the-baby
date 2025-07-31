import Pusher from 'pusher';
import { Octokit } from '@octokit/rest';

import { DEFAULT_TIME_PER_ROUND } from '../src/constants.js';

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
    return {
      gameId: null,
      players: [],
      gameMode: 'waiting',
      currentPhoto: null,
      scores: {},
      settings: { timePerPhoto: DEFAULT_TIME_PER_ROUND },
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
    const { selectedPhotos, timePerPhoto = 10 } = req.body;

    if (!selectedPhotos || selectedPhotos.length === 0) {
      return res.status(400).json({ error: 'No photos selected for the game' });
    }

    // Load current game state
    const gameState = await loadGameState();

    if (gameState.players.length === 0) {
      return res.status(400).json({ error: 'No players have joined the game yet' });
    }

    // Initialize new game
    const newGameId = Date.now().toString();
    const updatedGameState = {
      ...gameState,
      gameId: newGameId,
      gameMode: 'playing',
      selectedPhotos: selectedPhotos,
      currentRound: 1,
      currentPhoto: selectedPhotos[0],
      settings: { timePerPhoto },
      votes: [],
      roundStartTime: Date.now(),
      startedAt: new Date().toISOString()
    };

    // Reset scores for new game
    updatedGameState.players.forEach(player => {
      updatedGameState.scores[player.name] = 0;
    });

    // Save updated state
    await saveGameState(updatedGameState);

    // Notify all clients that the game has started
    await pusher.trigger('baby-game', 'game-started', {
      gameId: newGameId,
      photo: {
        id: selectedPhotos[0].id,
        url: selectedPhotos[0].url,
        // Don't send the correct answer to clients!
      },
      settings: { timePerPhoto },
      totalPhotos: selectedPhotos.length,
      currentRound: 1,
      players: updatedGameState.players,
      gameMode: 'playing'
    });

    res.json({ 
      success: true,
      message: 'Game started successfully',
      gameId: newGameId,
      totalPhotos: selectedPhotos.length
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: error.message });
  }
}