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

    const currentPhoto = selectedPhotos[currentRound - 1];

    if (!currentPhoto) {
      console.error('No photo found for round:', currentRound, 'in photos:', selectedPhotos);
      return res.status(400).json({ error: 'Invalid game state - no photo for current round' });
    }

    console.log(`[VOTE] Processing vote for round ${currentRound}, photo: ${currentPhoto.person}, answer: ${answer}`);

    // 2. Check if player already voted using NEW format with prefix
    const voteKey = `game:votes:round:${currentRound}`;
    const existingVote = await redis.hget(voteKey, `player:${playerName}`);
    if (existingVote) {
      console.log(`[VOTE] Player ${playerName} already voted: ${existingVote}`);
      return res.status(400).json({ error: 'Player already voted this round' });
    }

    // 3. Submit vote using VotesRedis service (which now uses prefixes)
    const { votesCount } = await VotesRedis.submitVote(currentRound, playerName, answer);

    // 4. Check if answer is correct and update score
    // UPDATED: Handle NO_ANSWER case
    let isCorrect = false;
    if (answer !== 'NO_ANSWER') {
      isCorrect = answer === currentPhoto.person;
      if (isCorrect) {
        await ScoresRedis.incrementScore(playerName, 1);
        console.log(`[VOTE] ✅ Correct answer! ${playerName} gets a point.`);
      } else {
        console.log(`[VOTE] ❌ Wrong answer. Correct: ${currentPhoto.person}, Got: ${answer}`);
      }
    } else {
      console.log(`[VOTE] ⏰ Timer expired for ${playerName} - no points awarded`);
    }

    // 5. Update player heartbeat
    await PlayersRedis.updateHeartbeat(playerName);

    // 6. Get current vote status using NEW format
    const { votes } = await VotesRedis.getRoundVotes(currentRound);
    const players = await PlayersRedis.getPlayers();
    const allPlayersVoted = votesCount >= players.length;

    console.log(`[VOTE] Vote submitted. Votes: ${JSON.stringify(votes)}, Count: ${votesCount}/${players.length}`);

    // 7. Emit vote update
    await pusher.trigger('baby-game', 'vote-update', {
      votes: votes,
      votesCount: votesCount,
      totalPlayers: players.length,
      allVoted: allPlayersVoted,
      round: currentRound
    });

    // 8. If all players voted, handle round completion
    if (allPlayersVoted) {
      console.log(`[VOTE] 🎯 All players voted! Processing round completion...`);
      
      const scores = await ScoresRedis.getScores();
      
      // Show round results
      await pusher.trigger('baby-game', 'round-ended', {
        round: currentRound,
        correctAnswer: currentPhoto.person,
        votes: votes,
        scores: scores,
        photo: currentPhoto
      });

      // Wait 3 seconds then move to next photo or end game
      setTimeout(async () => {
        try {
          if (currentRound >= selectedPhotos.length) {
            console.log(`[VOTE] 🏁 Game finished! Final round: ${currentRound}/${selectedPhotos.length}`);
            
            // Game finished - save to GitHub history (async)
            await saveGameToGitHubHistory(gameState, scores);
            
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
            await GameStateRedis.updateGameField('currentPhoto', {
              id: nextPhoto.id,
              url: nextPhoto.url
            });
            
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
          console.error('[VOTE] Error in round completion:', error);
        }
      }, 3000);
    }

    const responseTime = Date.now() - startTime;

    res.json({ 
      success: true,
      message: answer === 'NO_ANSWER' ? 'Timer expiry processed' : 'Vote submitted successfully',
      correct: isCorrect,
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