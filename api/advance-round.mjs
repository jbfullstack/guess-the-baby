// Ajouter cette API pour forcer l'avancement automatique
// api/advance-round.mjs

import Pusher from 'pusher';
import { GameStateRedis, VotesRedis, ScoresRedis, PlayersRedis } from '../src/services/redis.js';

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
    const { gameId, round } = req.body;

    console.log(`[AUTO-ADVANCE] Forcing advance for game ${gameId}, round ${round}`);

    // Get current game state
    const gameState = await GameStateRedis.getCurrentGame();
    
    if (!gameState.gameId || gameState.gameMode !== 'playing') {
      return res.status(400).json({ error: 'No active game found' });
    }

    const currentRound = parseInt(gameState.currentRound) || 1;
    
    if (round !== currentRound) {
      return res.status(400).json({ error: 'Round mismatch' });
    }

    // Parse selectedPhotos safely
    let selectedPhotos = [];
    try {
      if (typeof gameState.selectedPhotos === 'string') {
        selectedPhotos = JSON.parse(gameState.selectedPhotos);
      } else if (Array.isArray(gameState.selectedPhotos)) {
        selectedPhotos = gameState.selectedPhotos;
      }
    } catch (e) {
      console.error('Failed to parse selectedPhotos:', e.message);
      return res.status(500).json({ error: 'Invalid game state' });
    }

    const currentPhoto = selectedPhotos[currentRound - 1];
    const players = await PlayersRedis.getPlayers();
    const { votes } = await VotesRedis.getRoundVotes(currentRound);
    const scores = await ScoresRedis.getScores();

    // Show round results (even if not all players voted)
    await pusher.trigger('baby-game', 'round-ended', {
      round: currentRound,
      correctAnswer: currentPhoto?.person || 'Unknown',
      votes: votes,
      scores: scores,
      photo: currentPhoto,
      autoAdvanced: true // Flag to indicate this was auto-advanced
    });

    // Wait 3 seconds then move to next photo or end game
    setTimeout(async () => {
      try {
        if (currentRound >= selectedPhotos.length) {
          // Game finished
          await GameStateRedis.updateGameField('gameMode', 'finished');

          const winner = Object.entries(scores)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

          await pusher.trigger('baby-game', 'game-ended', {
            finalScores: scores,
            winner: winner,
            totalRounds: selectedPhotos.length
          });
        } else {
          // Next photo
          const nextRound = currentRound + 1;
          const nextPhoto = selectedPhotos[nextRound - 1];
          
          // Update game state
          await GameStateRedis.updateGameField('currentRound', nextRound);
          await GameStateRedis.updateGameField('currentPhoto', JSON.stringify({
            id: nextPhoto.id,
            url: nextPhoto.url
          }));
          
          // Set up vote counting for next round
          await VotesRedis.setTotalPlayers(nextRound, players.length);

          await pusher.trigger('baby-game', 'next-photo', {
            photo: {
              id: nextPhoto.id,
              url: nextPhoto.url
            },
            round: nextRound,
            totalRounds: selectedPhotos.length,
            scores: scores
          });
        }
      } catch (error) {
        console.error('[AUTO-ADVANCE] Error in delayed execution:', error);
      }
    }, 3000);

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: 'Round auto-advanced successfully',
      round: currentRound,
      nextRound: currentRound < selectedPhotos.length ? currentRound + 1 : null,
      responseTime: `${responseTime}ms`
    });

  } catch (error) {
    console.error('[AUTO-ADVANCE] Error:', error);
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}