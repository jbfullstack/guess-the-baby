import Pusher from 'pusher';
import { GameStateRedis, VotesRedis, ScoresRedis, PlayersRedis } from '../src/services/redis.js';
import redis from '../src/services/redis.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Système de score intelligent : Justesse + Vitesse + Ordre
function calculateSmartScore(isCorrect, answerTime, totalTime, answerOrder, totalPlayers) {
  if (!isCorrect) {
    return 0; // Pas de points pour mauvaise réponse
  }

  // Points de base pour bonne réponse
  const basePoints = 100;
  
  // Bonus vitesse (0-50 points) : plus tu réponds vite, plus tu as de bonus
  const timeRatio = Math.max(0, (totalTime - answerTime) / totalTime);
  const speedBonus = Math.round(timeRatio * 50);
  
  // Bonus ordre (0-25 points) : premier à répondre = max bonus
  const orderBonus = Math.round((totalPlayers - answerOrder + 1) / totalPlayers * 25);
  
  const totalScore = basePoints + speedBonus + orderBonus;
  
  console.log(`[SCORE] Smart scoring: base=${basePoints}, speed=${speedBonus}, order=${orderBonus}, total=${totalScore}`);
  
  return totalScore;
}

// Tracker pour l'ordre des réponses correctes
const correctAnswerOrder = new Map(); // round -> [playerName1, playerName2, ...]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { gameId, playerName, answer } = req.body;

    if (!playerName || !answer) {
      return res.status(400).json({ error: 'Player name and answer are required' });
    }

    console.log(`[VOTE] Processing vote: ${playerName} -> ${answer}`);

    // 1. Get current game state from Redis
    const gameState = await GameStateRedis.getCurrentGame();
    
    if (!gameState.gameId || gameState.gameMode !== 'playing') {
      return res.status(400).json({ error: 'No active game found' });
    }

    const currentRound = parseInt(gameState.currentRound) || 1;
    
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
      return res.status(500).json({ error: 'Invalid game state - corrupted photos data' });
    }

    // Parse game settings safely
    let gameSettings = { timePerPhoto: 10 };
    try {
      if (typeof gameState.settings === 'string') {
        gameSettings = JSON.parse(gameState.settings);
      } else if (typeof gameState.settings === 'object') {
        gameSettings = gameState.settings;
      }
    } catch (e) {
      console.warn('Failed to parse game settings:', e.message);
    }

    const currentPhoto = selectedPhotos[currentRound - 1];

    if (!currentPhoto) {
      console.error('No photo found for round:', currentRound, 'in photos:', selectedPhotos);
      return res.status(400).json({ error: 'Invalid game state - no photo for current round' });
    }

    console.log(`[VOTE] Processing vote for round ${currentRound}, photo: ${currentPhoto.person}, answer: ${answer}`);

    // 2. Submit vote using VotesRedis service (with separate keys)
    const { votesCount } = await VotesRedis.submitVote(currentRound, playerName, answer);

    // 3. Check if answer is correct and update score - NOUVEAU SYSTÈME ASTUCIEUX
    let isCorrect = false;
    let scoreGained = 0;
    
    if (answer !== 'NO_ANSWER') {
      isCorrect = answer === currentPhoto.person;
      
      if (isCorrect) {
        // Calculer le temps de réponse (approximatif basé sur timestamp)
        const gameStartTime = parseInt(gameState.startTime) || Date.now();
        const answerTime = Date.now() - gameStartTime;
        const totalTime = gameSettings?.timePerPhoto * 1000 || 10000; // 10 sec default
        
        // Tracker de l'ordre des bonnes réponses
        const roundKey = `round_${currentRound}`;
        if (!correctAnswerOrder.has(roundKey)) {
          correctAnswerOrder.set(roundKey, []);
        }
        const correctPlayers = correctAnswerOrder.get(roundKey);
        correctPlayers.push(playerName);
        const answerOrder = correctPlayers.length;
        
        // Calculer score intelligent
        scoreGained = calculateSmartScore(
          true, 
          answerTime, 
          totalTime, 
          answerOrder, 
          players.length
        );
        
        await ScoresRedis.incrementScore(playerName, scoreGained);
        
        console.log(`[VOTE] ✅ Correct answer! ${playerName} gets ${scoreGained} points (order: ${answerOrder})`);
        
        // Bonus pour le premier à répondre correctement
        if (answerOrder === 1) {
          console.log(`[VOTE] 🥇 ${playerName} was FIRST to answer correctly!`);
        }
      } else {
        console.log(`[VOTE] ❌ Wrong answer. Correct: ${currentPhoto.person}, Got: ${answer}`);
      }
    } else {
      console.log(`[VOTE] ⏰ Timer expired for ${playerName} - no points awarded`);
    }

    // 4. Update player heartbeat
    await PlayersRedis.updateHeartbeat(playerName);

    // 5. Get current vote status using NEW format
    const { votes } = await VotesRedis.getRoundVotes(currentRound);
    const players = await PlayersRedis.getPlayers();
    
    console.log(`[VOTE] Checking completion: votesCount=${votesCount}, players=${players.length}`);
    const allPlayersVoted = votesCount >= players.length;

    console.log(`[VOTE] Vote submitted. Votes: ${JSON.stringify(votes)}, Count: ${votesCount}/${players.length}`);

    // 6. Emit vote update
    await pusher.trigger('baby-game', 'vote-update', {
      votes: votes,
      votesCount: votesCount,
      totalPlayers: players.length,
      allVoted: allPlayersVoted,
      round: currentRound
    });

    // 7. If all players voted, handle round completion - FIXED
    if (allPlayersVoted) {
      console.log(`[VOTE] 🎯 All ${players.length} players voted! Processing round completion...`);
      
      const scores = await ScoresRedis.getScores();
      
      // Show round results
      await pusher.trigger('baby-game', 'round-ended', {
        round: currentRound,
        correctAnswer: currentPhoto.person,
        votes: votes,
        scores: scores,
        photo: currentPhoto
      });

      console.log(`[VOTE] 📤 Round results sent via Pusher`);

      // Wait 3 seconds then move to next photo or end game
      setTimeout(async () => {
        try {
          console.log(`[VOTE] 🕐 3 seconds passed, checking if game should continue...`);
          console.log(`[VOTE] Current round: ${currentRound}, Total photos: ${selectedPhotos.length}`);
          
          if (currentRound >= selectedPhotos.length) {
            console.log(`[VOTE] 🏁 Game finished! Final round: ${currentRound}/${selectedPhotos.length}`);
            
            // Game finished - save to GitHub history (async)
            saveGameToGitHubHistory(gameState, scores).catch(err => 
              console.error('[VOTE] History save failed:', err)
            );
            
            // Update game state to finished
            await GameStateRedis.updateGameField('gameMode', 'finished');

            const winner = Object.entries(scores)
              .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';

            await pusher.trigger('baby-game', 'game-ended', {
              finalScores: scores,
              winner: winner,
              totalRounds: selectedPhotos.length
            });
            
            console.log(`[VOTE] 🏆 Game ended. Winner: ${winner}`);
          } else {
            // Next photo
            const nextRound = currentRound + 1;
            const nextPhoto = selectedPhotos[nextRound - 1];
            
            console.log(`[VOTE] ➡️ Moving to round ${nextRound}: ${nextPhoto.person}`);
            
            // Update game state
            await GameStateRedis.updateGameField('currentRound', nextRound);
            await GameStateRedis.updateGameField('currentPhoto', JSON.stringify({
              id: nextPhoto.id,
              url: nextPhoto.url
            }));
            
            // Clear previous round votes
            await VotesRedis.clearRoundVotes(currentRound);
            console.log(`[VOTE] 🧹 Cleared votes for completed round ${currentRound}`);
            
            // Set up vote counting for next round
            await VotesRedis.setTotalPlayers(nextRound, players.length);
            console.log(`[VOTE] 👥 Set total players for round ${nextRound}: ${players.length}`);

            // Nettoyer l'ordre des réponses pour le round terminé
            const roundKey = `round_${currentRound}`;
            correctAnswerOrder.delete(roundKey);
            console.log(`[VOTE] 🧹 Cleaned answer order for completed round ${currentRound}`);

            await pusher.trigger('baby-game', 'next-photo', {
              photo: {
                id: nextPhoto.id,
                url: nextPhoto.url
              },
              round: nextRound,
              totalRounds: selectedPhotos.length,
              scores: scores
            });
            
            console.log(`[VOTE] 📤 Next photo event sent via Pusher`);
          }
        } catch (error) {
          console.error('[VOTE] ❌ Error in round completion:', error);
        }
      }, 3000);
    } else {
      console.log(`[VOTE] ⏳ Waiting for more votes: ${votesCount}/${players.length}`);
    }

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: answer === 'NO_ANSWER' ? 'Timer expiry processed' : 'Vote submitted successfully',
      correct: isCorrect,
      scoreGained: scoreGained, // NOUVEAU: Score gagné pour feedback joueur
      allVoted: allPlayersVoted,
      votesCount: votesCount,
      totalPlayers: players.length,
      responseTime: `${responseTime}ms`,
      timerExpired: answer === 'NO_ANSWER'
    });

  } catch (error) {
    console.error('[VOTE] Submit vote error:', error);
    
    // Handle specific errors
    if (error.message.includes('already voted')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

// Helper function to save completed game to GitHub (async)
async function saveGameToGitHubHistory(gameState, scores) {
  // Only save to GitHub for permanent history
  // This is async and doesn't block the game flow
  try {
    const { Octokit } = await import('@octokit/rest');
    
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Load existing history
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
      console.log('[HISTORY] Creating new gameHistory.json file');
    }

    // Add current game to history
    const gameRecord = {
      id: gameState.gameId,
      date: gameState.startedAt,
      players: Object.entries(scores).map(([name, score]) => ({
        name,
        score
      })),
      winner: Object.entries(scores)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown',
      totalRounds: JSON.parse(gameState.selectedPhotos || '[]').length,
      duration: calculateDuration(gameState.startedAt),
      photosUsed: JSON.parse(gameState.selectedPhotos || '[]').length,
      settings: JSON.parse(gameState.settings || '{}')
    };

    history.unshift(gameRecord);
    history = history.slice(0, 50); // Keep last 50 games

    // Save updated history
    let sha;
    try {
      const { data: existingFile } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameHistory.json',
      });
      sha = existingFile.sha;
    } catch (error) {
      // File doesn't exist yet
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameHistory.json',
      message: 'Add game to history',
      content: Buffer.from(JSON.stringify(history, null, 2)).toString('base64'),
      sha
    });

    console.log('[HISTORY] ✅ Game saved to GitHub history successfully');
  } catch (error) {
    console.error('[HISTORY] ❌ Failed to save game to GitHub history:', error);
    // Don't throw - this is async and shouldn't break the game
  }
}

function calculateDuration(startTime) {
  const duration = Date.now() - new Date(startTime).getTime();
  const minutes = Math.floor(duration / 60000);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}