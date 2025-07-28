import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load current game state
    let gameState = {
      gameId: null,
      players: [],
      gameMode: 'waiting',
      currentPhoto: null,
      scores: {},
      settings: { timePerPhoto: 10, autoNext: true },
      selectedPhotos: [],
      currentRound: 0,
      votes: []
    };
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'currentGame.json',
      });
      gameState = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      // File doesn't exist yet, return default state
    }

    // Load photos and names
    let gameData = { photos: [], names: [] };
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameData.json',
      });
      gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      // File doesn't exist yet
    }

    // Load game history
    let history = [];
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameHistory.json',
      });
      history = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      // File doesn't exist yet
    }

    // Return complete state for recovery
    res.json({
      success: true,
      gameState: {
        ...gameState,
        currentPhoto: gameState.gameMode === 'playing' && gameState.selectedPhotos[gameState.currentRound - 1] 
          ? {
              id: gameState.selectedPhotos[gameState.currentRound - 1].id,
              url: gameState.selectedPhotos[gameState.currentRound - 1].url
            }
          : null
      },
      photos: gameData.photos || [],
      names: gameData.names || [],
      gameHistory: history || []
    });

  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: error.message });
  }
}