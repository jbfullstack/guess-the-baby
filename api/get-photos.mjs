import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📷 Loading photos from GitHub...');
    
    // Load photos from GitHub
    let gameData = { photos: [], names: [] };
    
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameData.json',
      });
      gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
      console.log(`✅ Loaded ${gameData.photos.length} photos`);
    } catch (error) {
      console.log('📝 No gameData.json found, creating default...');
      // File doesn't exist yet, return empty data
    }

    // Ensure we have some default names even if no photos
    if (gameData.names.length === 0) {
      gameData.names = [];
    }

    res.json({
      success: true,
      photos: gameData.photos || [],
      names: gameData.names || []
    });

  } catch (error) {
    console.error('❌ Get photos error:', error);
    res.status(500).json({ error: error.message });
  }
}