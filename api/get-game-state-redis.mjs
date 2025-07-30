import { GameStateRedis, PlayersRedis, ScoresRedis, VotesRedis } from '../src/services/redis.js';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // 1. Get real-time data from Redis (FAST!)
    const [gameState, players, scores] = await Promise.all([
      GameStateRedis.getCurrentGame(),
      PlayersRedis.getPlayers(),
      ScoresRedis.getScores()
    ]);

    // 2. Get current round votes if game is playing
    let currentVotes = [];
    if (gameState.gameMode === 'playing' && gameState.currentRound) {
      const { votes } = await VotesRedis.getRoundVotes(parseInt(gameState.currentRound));
      currentVotes = votes;
    }

    // 3. Parse stored JSON data safely
    let currentPhoto = null;
    let selectedPhotos = [];
    
    if (gameState.currentPhoto) {
      try {
        if (typeof gameState.currentPhoto === 'string') {
          currentPhoto = JSON.parse(gameState.currentPhoto);
        } else if (typeof gameState.currentPhoto === 'object') {
          currentPhoto = gameState.currentPhoto;
        }
      } catch (e) {
        console.warn('Failed to parse currentPhoto:', e.message);
      }
    }

    if (gameState.selectedPhotos) {
      try {
        if (typeof gameState.selectedPhotos === 'string') {
          selectedPhotos = JSON.parse(gameState.selectedPhotos);
        } else if (Array.isArray(gameState.selectedPhotos)) {
          selectedPhotos = gameState.selectedPhotos;
        }
      } catch (e) {
        console.warn('Failed to parse selectedPhotos:', e.message);
      }
    }

    // Parse settings safely
    let gameSettings = gameState.settings || { timePerPhoto: 10 };
    if (gameState.settings) {
      try {
        if (typeof gameState.settings === 'string') {
          gameSettings = JSON.parse(gameState.settings);
        } else if (typeof gameState.settings === 'object') {
          gameSettings = gameState.settings;
        }
      } catch (e) {
        console.warn('Failed to parse settings:', e.message);
      }
    }

    // 4. Load photos and history from GitHub (SLOWER, but cached)
    const [photosData, historyData] = await Promise.all([
      getPhotosFromGitHub(),
      getHistoryFromGitHub()
    ]);

    const responseTime = Date.now() - startTime;

    // 5. Return complete state for recovery
    res.json({
      success: true,
      responseTime: `${responseTime}ms`,
      gameState: {
        gameId: gameState.gameId,
        gameMode: gameState.gameMode || 'waiting',
        currentRound: parseInt(gameState.currentRound) || 0,
        totalPhotos: parseInt(gameState.totalPhotos) || 0,
        currentPhoto: currentPhoto,
        selectedPhotos: selectedPhotos,
        players: players,
        scores: scores,
        votes: currentVotes,
        settings: gameSettings,
        startTime: gameState.startTime ? parseInt(gameState.startTime) : null,
        startedAt: gameState.startedAt
      },
      photos: photosData.photos,
      names: photosData.names,
      gameHistory: historyData,
      dataSource: {
        gameState: 'Redis (real-time)',
        photos: 'GitHub (persistent)',
        history: 'GitHub (persistent)'
      }
    });

  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

// Helper to load photos from GitHub
async function getPhotosFromGitHub() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
    });
    return JSON.parse(Buffer.from(data.content, 'base64').toString());
  } catch (error) {
    console.warn('No photos found in GitHub:', error.message);
    return { photos: [], names: [] };
  }
}

// Helper to load history from GitHub
async function getHistoryFromGitHub() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameHistory.json',
    });
    return JSON.parse(Buffer.from(data.content, 'base64').toString());
  } catch (error) {
    console.warn('No history found in GitHub:', error.message);
    return [];
  }
}