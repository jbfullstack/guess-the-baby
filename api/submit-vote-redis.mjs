import Pusher from 'pusher';
import { GameStateRedis, VotesRedis, ScoresRedis, PlayersRedis } from '../src/services/redis.js';

import { DEFAULT_TIME_PER_ROUND } from '../src/constants.js';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

// Système de score AMÉLIORÉ style Kahoot : Justesse + Vitesse + Ordre
function calculateKahootScore(isCorrect, answerTime, totalTime, answerOrder, totalPlayers) {
  if (!isCorrect) {
    return 0; // Pas de points pour mauvaise réponse
  }

  // Points de base pour bonne réponse (style Kahoot)
  const basePoints = 100;
  
  // BONUS VITESSE (0-100 points) : Style Kahoot - plus rapide = plus de bonus
  const timeRatio = Math.max(0, Math.min(1, (totalTime - answerTime) / totalTime));
  const speedBonus = Math.round(timeRatio * 100);
  
  // BONUS ORDRE (0-50 points) : Premier = max bonus
  const maxOrderBonus = 50;
  const orderBonus = Math.round((totalPlayers - answerOrder + 1) / totalPlayers * maxOrderBonus);
  
  const totalScore = basePoints + speedBonus + orderBonus;
  
  console.log(`[KAHOOT SCORE] ${isCorrect ? '✅' : '❌'} Answer for order ${answerOrder}:`);
  console.log(`  Base: ${basePoints} pts`);
  console.log(`  Speed: ${speedBonus} pts (${Math.round(timeRatio*100)}% time left)`);
  console.log(`  Order: ${orderBonus} pts (rank ${answerOrder}/${totalPlayers})`);
  console.log(`  🎯 TOTAL: ${totalScore} pts`);
  
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

    console.log(`[VOTE] 🎮 Processing vote: ${playerName} -> ${answer}`);

    // 🎯 SPECIAL HANDLING FOR PRELOAD COMPLETION
    if (answer === 'PRELOAD_COMPLETE') {
      return await handlePreloadComplete(playerName, gameId, res, startTime);
    }

    // 1. Get current game state from Redis - FIXED avec nouvelles clés
    const gameState = await GameStateRedis.getCurrentGame();
    
    if (!gameState.gameId || gameState.gameMode !== 'playing') {
      console.log(`[VOTE] ❌ Invalid game state: mode=${gameState.gameMode}, id=${gameState.gameId}`);
      return res.status(400).json({ error: 'No active game found' });
    }

    const currentRound = parseInt(gameState.currentRound) || 1;
    const selectedPhotos = gameState.selectedPhotos || [];
    const gameSettings = gameState.settings || { timePerPhoto: DEFAULT_TIME_PER_ROUND };

    console.log(`[VOTE] 📊 Game state: round ${currentRound}/${selectedPhotos.length}, photos: ${selectedPhotos.length}`);

    const currentPhoto = selectedPhotos[currentRound - 1];

    if (!currentPhoto) {
      console.error('[VOTE] ❌ No photo found for round:', currentRound, 'Available photos:', selectedPhotos.length);
      return res.status(400).json({ error: `Invalid game state - no photo for round ${currentRound}` });
    }

    console.log(`[VOTE] 🖼️ Current photo: ${currentPhoto.person} (round ${currentRound})`);

    // 2. Submit vote using VotesRedis service
    const { votesCount } = await VotesRedis.submitVote(currentRound, playerName, answer);

    // 3. Get current players count
    const players = await PlayersRedis.getPlayers();
    const totalPlayers = players.length;
    
    console.log(`[VOTE] 👥 Player count: ${totalPlayers}, votes: ${votesCount}`);

    // 4. SYSTÈME DE SCORE KAHOOT AMÉLIORÉ
    let isCorrect = false;
    let scoreGained = 0;
    
    if (answer !== 'NO_ANSWER') {
      isCorrect = answer === currentPhoto.person;
      
      if (isCorrect) {
        // Calculer le temps de réponse précis
        const roundStartTime = parseInt(gameState.roundStartTime) || Date.now() - 5000;
        const answerTime = Date.now() - roundStartTime;
        const totalTime = (gameSettings?.timePerPhoto || 10) * 1000;
        
        // Tracker de l'ordre des bonnes réponses
        const roundKey = `round_${currentRound}`;
        if (!correctAnswerOrder.has(roundKey)) {
          correctAnswerOrder.set(roundKey, []);
        }
        const correctPlayers = correctAnswerOrder.get(roundKey);
        correctPlayers.push(playerName);
        const answerOrder = correctPlayers.length;
        
        // 🎯 SCORE KAHOOT
        scoreGained = calculateKahootScore(
          true, 
          answerTime, 
          totalTime, 
          answerOrder, 
          totalPlayers
        );
        
        await ScoresRedis.incrementScore(playerName, scoreGained);
        
        console.log(`[VOTE] ✅ CORRECT! ${playerName} gets ${scoreGained} points (${answerOrder}/${totalPlayers})`);
        
        // Bonus messages style Kahoot
        if (answerOrder === 1) {
          console.log(`[VOTE] 🥇🔥 ${playerName} was FIRST to answer correctly!`);
        } else if (answerTime < totalTime * 0.3) {
          console.log(`[VOTE] ⚡🚀 ${playerName} answered lightning fast!`);
        }
      } else {
        console.log(`[VOTE] ❌ Wrong answer. Correct: ${currentPhoto.person}, Got: ${answer}`);
      }
    } else {
      console.log(`[VOTE] ⏰ Timer expired for ${playerName} - no points awarded`);
    }

    // 5. Update player heartbeat
    await PlayersRedis.updateHeartbeat(playerName);

    // 6. Get current vote status
    const { votes } = await VotesRedis.getRoundVotes(currentRound);
    
    console.log(`[VOTE] 📊 Vote status: ${votesCount}/${totalPlayers} players voted`);
    const allPlayersVoted = votesCount >= totalPlayers;

    // 7. Emit vote update
    await pusher.trigger('baby-game', 'vote-update', {
      votes: votes,
      votesCount: votesCount,
      totalPlayers: totalPlayers,
      allVoted: allPlayersVoted,
      round: currentRound
    });

    // 8. GESTION FIN DE ROUND ET FIN DE JEU - FIXED
    if (allPlayersVoted) {
      console.log(`[VOTE] 🎯 All ${totalPlayers} players voted! Processing round completion...`);
      
      const scores = await ScoresRedis.getScores();
      
      // Envoyer les résultats du round
      await pusher.trigger('baby-game', 'round-ended', {
        round: currentRound,
        correctAnswer: currentPhoto.person,
        votes: votes,
        scores: scores,
        photo: currentPhoto,
        nextRoundDelay: 3000
      });

      console.log(`[VOTE] 📤 Round ${currentRound} results sent via Pusher`);

      // DÉTECTION FIN DE JEU - CRITICAL FIX
      console.log(`[VOTE] 🔍 Checking game end: currentRound=${currentRound}, totalPhotos=${selectedPhotos.length}`);
      
      if (currentRound >= selectedPhotos.length) {
        console.log(`[VOTE] 🏁🎉 GAME FINISHED! Round ${currentRound}/${selectedPhotos.length}`);
        
        // Calculate final results
        const sortedScores = Object.entries(scores).sort(([,a], [,b]) => b - a);
        const winner = sortedScores[0]?.[0] || 'Unknown';
        
        console.log(`[VOTE] 🏆 Final Results:`, {
          winner,
          scores: sortedScores,
          totalRounds: selectedPhotos.length
        });
        
        // ⚠️ CRITICAL: Update game state to finished FIRST
        await GameStateRedis.updateGameField('gameMode', 'finished');
        await GameStateRedis.updateGameField('winner', winner);
        await GameStateRedis.updateGameField('endedAt', new Date().toISOString());

        console.log(`[VOTE] ✅ Game state updated to FINISHED`);

        // 🔥 SAVE TO GITHUB HISTORY - CRITICAL FIX
        console.log(`[VOTE] 💾 Starting history save for game ${gameState.gameId}...`);
        
        try {
          await saveGameToGitHubHistory(gameState, scores, selectedPhotos.length, players);
          console.log(`[VOTE] ✅ History save completed successfully`);
        } catch (historyError) {
          console.error(`[VOTE] ❌ HISTORY SAVE FAILED:`, historyError);
          console.error(`[VOTE] ❌ Game data:`, {
            gameId: gameState.gameId,
            winner,
            totalPlayers: players.length,
            scores
          });
        }
        
        // 🎉 SEND GAME END EVENT - CRITICAL
        await pusher.trigger('baby-game', 'game-ended', {
          finalScores: scores,
          winner: winner,
          totalRounds: selectedPhotos.length,
          gameId: gameState.gameId,
          playedRounds: currentRound,
          showDelay: 3000, // Tell clients to show results after 3 seconds
          gameMode: 'finished' // 🔥 IMPORTANT pour déclencher GameFinished component
        });
        
        console.log(`[VOTE] 🏆✅ GAME END EVENT SENT! Winner: ${winner}`);

        // Clean up answer order for finished game
        correctAnswerOrder.clear();
        console.log(`[VOTE] 🧹 Cleaned all answer order data for finished game`);
        
      } else {
        // Next photo logic - IMMEDIATE
        const nextRound = currentRound + 1;
        const nextPhoto = selectedPhotos[nextRound - 1];
        
        if (!nextPhoto) {
          console.error(`[VOTE] ❌ No photo found for next round ${nextRound}`);
          throw new Error(`No photo found for round ${nextRound}`);
        }
        
        console.log(`[VOTE] ➡️ Moving to round ${nextRound}: ${nextPhoto.person}`);
        
        // Update game state immediately
        await GameStateRedis.updateGameField('currentRound', nextRound);
        await GameStateRedis.updateGameField('currentPhoto', {
          id: nextPhoto.id,
          url: nextPhoto.url
        });
        await GameStateRedis.updateGameField('roundStartTime', Date.now());
        
        // Clear previous round votes
        await VotesRedis.clearRoundVotes(currentRound);
        console.log(`[VOTE] 🧹 Cleared votes for completed round ${currentRound}`);
        
        // Get FRESH player count for next round
        const freshPlayers = await PlayersRedis.getPlayers();
        const freshPlayerCount = freshPlayers.length;
        
        // Set up vote counting for next round
        await VotesRedis.setTotalPlayers(nextRound, freshPlayerCount);
        console.log(`[VOTE] 👥 Set total players for round ${nextRound}: ${freshPlayerCount}`);

        // Clean answer order for completed round
        const roundKey = `round_${currentRound}`;
        correctAnswerOrder.delete(roundKey);
        console.log(`[VOTE] 🧹 Cleaned answer order for completed round ${currentRound}`);

        // Trigger next photo with delay instruction
        await pusher.trigger('baby-game', 'next-photo', {
          photo: {
            id: nextPhoto.id,
            url: nextPhoto.url
          },
          round: nextRound,
          totalRounds: selectedPhotos.lengtapplyNextPhoto,
          scores: scores,
          gameMode: 'playing',
          showDelay: 3000,
          settings: gameSettings || { timePerPhoto: DEFAULT_TIME_PER_ROUND }
        });
        
        console.log(`[VOTE] 📤➡️ Next photo event sent for round ${nextRound}`);
      }
    } else {
      console.log(`[VOTE] ⏳ Waiting for more votes: ${votesCount}/${totalPlayers}`);
    }

    const responseTime = Date.now() - startTime;

    // 🎯 RESPONSE avec données Kahoot pour affichage client
    res.json({ 
      success: true,
      message: answer === 'NO_ANSWER' ? 'Timer expiry processed' : 'Vote submitted successfully',
      correct: isCorrect,
      scoreGained: scoreGained, 
      allVoted: allPlayersVoted,
      votesCount: votesCount,
      totalPlayers: totalPlayers,
      responseTime: `${responseTime}ms`,
      timerExpired: answer === 'NO_ANSWER',
      // 🎮 Données style Kahoot pour l'UI
      kahootData: isCorrect ? {
        isCorrect: true,
        scoreGained: scoreGained,
        speedBonus: scoreGained > 150 ? 'lightning' : scoreGained > 125 ? 'fast' : 'good',
        rank: correctAnswerOrder.get(`round_${currentRound}`)?.length || 0
      } : null
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

// Handle preload completion signals
async function handlePreloadComplete(playerName, gameId, res, startTime) {
  try {
    console.log(`[PRELOAD] 🖼️ Player ${playerName} completed preloading`);
    
    // Get current game state
    const gameState = await GameStateRedis.getCurrentGame();
    
    if (gameState.gameMode !== 'preloading') {
      return res.status(400).json({ 
        error: 'Game is not in preloading mode',
        currentMode: gameState.gameMode 
      });
    }
    
    // Parse current preloading players
    let preloadingPlayers = {};
    try {
      if (gameState.preloadingPlayers) {
        preloadingPlayers = JSON.parse(gameState.preloadingPlayers);
      }
    } catch (error) {
      console.warn('[PRELOAD] Failed to parse preloadingPlayers, using empty object');
    }
    
    // Add this player to ready list
    preloadingPlayers[playerName] = {
      readyAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Update Redis with new ready player
    await GameStateRedis.updateGameField('preloadingPlayers', preloadingPlayers);
    
    // Get current players count
    const players = await PlayersRedis.getPlayers();
    const totalPlayers = players.length;
    const readyPlayers = Object.keys(preloadingPlayers).length;
    
    console.log(`[PRELOAD] 📊 Ready players: ${readyPlayers}/${totalPlayers}`);
    
    // Notify all clients about readiness update
    await pusher.trigger('baby-game', 'preload-progress', {
      readyPlayers: preloadingPlayers,
      readyCount: readyPlayers,
      totalPlayers: totalPlayers,
      allReady: readyPlayers >= totalPlayers
    });
    
    // Check if all players are ready to start the actual game
    if (readyPlayers >= totalPlayers) {
      console.log(`[PRELOAD] 🎮 All players ready! Starting actual game...`);
      
      try {
        // Parse selected photos for game start
        const selectedPhotos = JSON.parse(gameState.selectedPhotos || '[]');
        const gameSettings = JSON.parse(gameState.settings || '{}');
        
        if (selectedPhotos.length === 0) {
          throw new Error('No photos available for game start');
        }
        
        // Update game state to playing
        await GameStateRedis.updateGameField('gameMode', 'playing');
        await GameStateRedis.updateGameField('currentRound', 1);
        await GameStateRedis.updateGameField('roundStartTime', Date.now());
        
        // Clear preloading players data
        await GameStateRedis.updateGameField('preloadingPlayers', {});
        
        // Initialize scores for all players
        const playerNames = players.map(p => p.name);
        await ScoresRedis.resetScores();
        const initializedScores = await ScoresRedis.initializeScores(playerNames);
        console.log('[PRELOAD] ✅ Scores initialized:', initializedScores);
        
        // Set up vote counting for round 1
        await VotesRedis.setTotalPlayers(1, players.length);
        
        // Start the actual game
        await pusher.trigger('baby-game', 'game-started', {
          gameId: gameState.gameId,
          photo: {
            id: selectedPhotos[0].id,
            url: selectedPhotos[0].url
          },
          settings: gameSettings,
          totalPhotos: selectedPhotos.length,
          currentRound: 1,
          players: players,
          gameMode: 'playing'
        });
        
        console.log(`[PRELOAD] ✅ Game officially started! First photo: ${selectedPhotos[0].id}`);
        
      } catch (error) {
        console.error('[PRELOAD] ❌ Failed to start game after preloading:', error);
        
        // Notify clients about the error
        await pusher.trigger('baby-game', 'preload-error', {
          error: 'Failed to start game after preloading',
          details: error.message
        });
        
        return res.status(500).json({
          error: 'Failed to start game after preloading',
          details: error.message,
          responseTime: `${Date.now() - startTime}ms`
        });
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return res.json({
      success: true,
      message: 'Preload completion recorded',
      readyPlayers: readyPlayers,
      totalPlayers: totalPlayers,
      allReady: readyPlayers >= totalPlayers,
      gameStarted: readyPlayers >= totalPlayers,
      responseTime: `${responseTime}ms`
    });
    
  } catch (error) {
    console.error('[PRELOAD] ❌ Error handling preload completion:', error);
    
    const responseTime = Date.now() - startTime;
    return res.status(500).json({
      error: 'Failed to handle preload completion',
      details: error.message,
      responseTime: `${responseTime}ms`
    });
  }
}

// 🔥 CRITICAL: Helper function to save completed game to GitHub - FIXED VERSION
async function saveGameToGitHubHistory(gameState, scores, totalRounds, players) {
  console.log('[HISTORY] 🚀 Starting GitHub history save...');
  
  try {
    const { Octokit } = await import('@octokit/rest');
    
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    console.log('[HISTORY] 📡 GitHub client initialized');

    // 🔧 CRITICAL FIX: Parse settings properly (was causing the bug!)
    let parsedSettings = { timePerPhoto: DEFAULT_TIME_PER_ROUND };
    try {
      if (typeof gameState.settings === 'string') {
        parsedSettings = JSON.parse(gameState.settings);
      } else if (typeof gameState.settings === 'object' && gameState.settings !== null) {
        parsedSettings = gameState.settings;
      }
      console.log('[HISTORY] ⚙️ Parsed settings:', parsedSettings);
    } catch (settingsError) {
      console.warn('[HISTORY] ⚠️ Could not parse settings, using default:', settingsError.message);
    }

    // 🔧 CRITICAL FIX: Handle startTime properly
    let gameStartTime = gameState.startTime;
    if (typeof gameStartTime === 'string') {
      gameStartTime = parseInt(gameStartTime);
    }
    if (!gameStartTime || isNaN(gameStartTime)) {
      gameStartTime = Date.now() - 10 * 60 * 1000; // Default to 10 minutes ago
      console.warn('[HISTORY] ⚠️ Invalid startTime, using default');
    }

    console.log('[HISTORY] ⏰ Game start time:', new Date(gameStartTime).toISOString());

    // Load existing history
    let history = [];
    let sha;
    
    try {
      console.log('[HISTORY] 📖 Loading existing history from GitHub...');
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameHistory.json',
      });
      
      history = JSON.parse(Buffer.from(data.content, 'base64').toString());
      sha = data.sha;
      console.log(`[HISTORY] ✅ Loaded existing history with ${history.length} games`);
      
    } catch (loadError) {
      if (loadError.status === 404) {
        console.log('[HISTORY] 📝 gameHistory.json not found, will create new file');
      } else {
        console.error('[HISTORY] ❌ Error loading existing history:', loadError.message);
        throw loadError;
      }
    }

    // Calculate winner
    const sortedScores = Object.entries(scores).sort(([,a], [,b]) => b - a);
    const winner = sortedScores[0]?.[0] || 'Unknown';

    // 🔥 CRITICAL: Create game record with proper data handling
    const gameRecord = {
      id: parseInt(gameState.gameId) || Date.now(),
      date: gameStartTime,
      endedAt: new Date().toISOString(),
      players: sortedScores.map(([name, score]) => ({ 
        name: name || 'Unknown', 
        score: parseInt(score) || 0 
      })),
      winner: winner,
      totalRounds: parseInt(totalRounds) || 0,
      duration: calculateDuration(gameStartTime),
      photosUsed: parseInt(totalRounds) || 0,
      settings: parsedSettings
    };

    console.log('[HISTORY] 📝 Game record prepared:', {
      id: gameRecord.id,
      winner: gameRecord.winner,
      players: gameRecord.players.length,
      totalRounds: gameRecord.totalRounds
    });

    // Add to history and limit to 50 games
    history.unshift(gameRecord);
    history = history.slice(0, 50);

    console.log(`[HISTORY] 📚 Updated history: ${history.length} games total`);

    // Save updated history to GitHub
    console.log('[HISTORY] 💾 Saving to GitHub...');
    
    const result = await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameHistory.json',
      message: `Add game ${gameState.gameId} to history - Winner: ${winner}`,
      content: Buffer.from(JSON.stringify(history, null, 2)).toString('base64'),
      ...(sha && { sha })
    });

    console.log('[HISTORY] ✅ Game saved to GitHub history successfully!');
    console.log('[HISTORY] 📊 Commit SHA:', result.data.commit?.sha?.substring(0, 8));
    
    return gameRecord;

  } catch (error) {
    console.error('[HISTORY] ❌ CRITICAL ERROR saving to GitHub:', error);
    console.error('[HISTORY] ❌ Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      githubOwner: process.env.GITHUB_REPO_OWNER,
      githubRepo: process.env.GITHUB_REPO_NAME,
      hasGithubToken: !!process.env.GITHUB_TOKEN
    });
    
    throw error;
  }
}

// Helper function to calculate game duration
function calculateDuration(startTime) {
  if (!startTime) return 'Unknown';
  
  try {
    const start = typeof startTime === 'number' ? startTime : new Date(startTime).getTime();
    const duration = Date.now() - start;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  } catch (error) {
    console.warn('[HISTORY] Could not calculate duration:', error.message);
    return 'Unknown';
  }
}