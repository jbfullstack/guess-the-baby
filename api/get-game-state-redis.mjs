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
    // 🎯 NEW: Check if this is a history-only request
    const { historyOnly } = req.query;
    
    if (historyOnly === 'true') {
      // Return ONLY formatted history for HistoryPage
      console.log('📖 History-only request detected');
      
      const historyData = await getHistoryFromGitHub();
      
      // Format data to match HistoryPage expectations
      const formattedHistory = historyData.map(game => ({
        gameId: game.id?.toString() || game.gameId || 'unknown',
        id: game.id || game.gameId,
        date: game.date || game.endedAt,
        endedAt: game.endedAt || game.date,
        startTime: game.startTime || null,
        players: game.players || [],
        winner: game.winner || 'Unknown',
        totalRounds: game.totalRounds || game.photosUsed || 0,
        totalPhotos: game.photosUsed || game.totalRounds || 0,
        photosUsed: game.photosUsed || game.totalRounds || 0,
        duration: game.duration || 'Unknown',
        settings: game.settings || { timePerPhoto: 10 },
        finalScores: game.players ? 
          game.players.reduce((acc, player) => {
            acc[player.name] = player.score;
            return acc;
          }, {}) : {}
      }));

      // Sort by date (most recent first)
      formattedHistory.sort((a, b) => {
        const dateA = new Date(a.endedAt || a.date);
        const dateB = new Date(b.endedAt || b.date);
        return dateB - dateA;
      });

      const responseTime = Date.now() - startTime;

      return res.json({
        success: true,
        history: formattedHistory,
        count: formattedHistory.length,
        responseTime: `${responseTime}ms`,
        dataSource: 'GitHub gameHistory.json'
      });
    }

    // 🔄 EXISTING FUNCTIONALITY: Full game state recovery (unchanged)
    console.log('🔄 Full game state request');

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

    // 5. Return complete state for recovery (UNCHANGED)
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
    
    const responseTime = Date.now() - startTime;
    
    res.status(500).json({ 
      error: error.message,
      responseTime: `${responseTime}ms`,
      // Fallback for history-only requests
      ...(req.query.historyOnly === 'true' && {
        success: false,
        history: [],
        count: 0
      })
    });
  }
}

// Helper to load photos from GitHub (UNCHANGED)
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

// Helper to load history from GitHub (UNCHANGED)
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