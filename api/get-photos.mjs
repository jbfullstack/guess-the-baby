import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load photos from GitHub
    let gameData = { photos: [], names: [] };
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameData.json',
      });
      gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      // File doesn't exist yet, return empty data
    }

    res.json({
      success: true,
      photos: gameData.photos || [],
      names: gameData.names || []
    });

  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: error.message });
  }
}