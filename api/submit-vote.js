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
    return null;
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

// Helper to save game to history
async function saveGameToHistory(gameState) {
  try {
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
    }

    // Add current game to history
    const gameRecord = {
      id: gameState.gameId,
      date: gameState.startedAt,
      players: gameState.players.map(p => ({
        name: p.name,
        score: gameState.scores[p.name] || 0
      })),
      winner: Object.entries(gameState.scores)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown',
      totalRounds: gameState.selectedPhotos.length,
      duration: calculateDuration(gameState.startedAt),
      photosUsed: gameState.selectedPhotos.length,
      settings: gameState.settings
    };

    history.unshift(gameRecord); // Add to beginning
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

  } catch (error) {
    console.error('Failed to save game to history:', error);
  }
}

function calculateDuration(startTime) {
  const duration = Date.now() - new Date(startTime).getTime();
  const minutes = Math.floor(duration / 60000);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameId, playerName, answer } = req.body;

    if (!playerName || !answer) {
      return res.status(400).json({ error: 'Player name and answer are required' });
    }

    // Load current game state
    const gameState = await loadGameState();
    
    if (!gameState || gameState.gameMode !== 'playing') {
      return res.status(400).json({ error: 'No active game found' });
    }

    // Check if player already voted this round
    const existingVote = gameState.votes?.find(v => 
      v.player === playerName && v.round === gameState.currentRound
    );
    
    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted this round' });
    }

    // Add vote
    if (!gameState.votes) gameState.votes = [];
    
    const vote = {
      player: playerName,
      answer,
      round: gameState.currentRound,
      timestamp: Date.now(),
      correct: answer === gameState.selectedPhotos[gameState.currentRound - 1]?.person
    };
    
    gameState.votes.push(vote);

    // Update score if correct
    if (vote.correct) {
      gameState.scores[playerName] = (gameState.scores[playerName] || 0) + 1;
    }

    // Check if all players have voted
    const currentRoundVotes = gameState.votes.filter(v => v.round === gameState.currentRound);
    const allPlayersVoted = currentRoundVotes.length >= gameState.players.length;

    // Emit vote update
    await pusher.trigger('baby-game', 'vote-update', {
      votes: currentRoundVotes,
      votesCount: currentRoundVotes.length,
      totalPlayers: gameState.players.length,
      allVoted: allPlayersVoted
    });

    if (allPlayersVoted) {
      // Show round results
      await pusher.trigger('baby-game', 'round-ended', {
        round: gameState.currentRound,
        correctAnswer: gameState.selectedPhotos[gameState.currentRound - 1]?.person,
        votes: currentRoundVotes,
        scores: gameState.scores,
        photo: gameState.selectedPhotos[gameState.currentRound - 1]
      });

      // Wait 3 seconds then move to next photo or end game
      setTimeout(async () => {
        if (gameState.currentRound >= gameState.selectedPhotos.length) {
          // Game finished
          await saveGameToHistory(gameState);
          
          gameState.gameMode = 'finished';
          await saveGameState(gameState);

          await pusher.trigger('baby-game', 'game-ended', {
            finalScores: gameState.scores,
            winner: Object.entries(gameState.scores)
              .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown',
            totalRounds: gameState.selectedPhotos.length
          });
        } else {
          // Next photo
          gameState.currentRound++;
          gameState.roundStartTime = Date.now();
          await saveGameState(gameState);

          await pusher.trigger('baby-game', 'next-photo', {
            photo: {
              id: gameState.selectedPhotos[gameState.currentRound - 1].id,
              url: gameState.selectedPhotos[gameState.currentRound - 1].url
            },
            round: gameState.currentRound,
            totalRounds: gameState.selectedPhotos.length,
            scores: gameState.scores
          });
        }
      }, 3000);
    }

    // Save updated state
    await saveGameState(gameState);

    res.json({ 
      success: true,
      message: 'Vote submitted successfully',
      correct: vote.correct,
      allVoted: allPlayersVoted
    });

  } catch (error) {
    console.error('Submit vote error:', error);
    res.status(500).json({ error: error.message });
  }
}