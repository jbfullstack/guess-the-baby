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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resetType = 'soft' } = req.body; // 'soft' or 'hard'

    // Create fresh game state
    const freshGameState = {
      gameId: null,
      players: resetType === 'hard' ? [] : [], // For now, always clear players
      gameMode: 'waiting',
      currentPhoto: null,
      scores: {},
      settings: { timePerPhoto: 10, autoNext: true },
      selectedPhotos: [],
      currentRound: 0,
      votes: [],
      createdAt: new Date().toISOString()
    };

    // Save reset state to GitHub
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
      message: `Reset game (${resetType})`,
      content: Buffer.from(JSON.stringify(freshGameState, null, 2)).toString('base64'),
      sha
    });

    // Notify all clients that game has been reset
    await pusher.trigger('baby-game', 'game-reset', {
      resetType,
      message: resetType === 'hard' 
        ? 'Game reset completely - all players cleared' 
        : 'Game reset - players can rejoin',
      timestamp: Date.now()
    });

    res.json({ 
      success: true,
      message: `Game reset successfully (${resetType})`,
      resetType
    });

  } catch (error) {
    console.error('Reset game error:', error);
    res.status(500).json({ error: error.message });
  }
}