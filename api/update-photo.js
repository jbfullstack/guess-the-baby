import { Octokit } from '@octokit/rest';
import Pusher from 'pusher';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoId, newName } = req.body;

    if (!photoId || !newName) {
      return res.status(400).json({ error: 'Photo ID and new name are required' });
    }

    // Get current game data
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
    });
    
    const gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    
    // Find and update the photo
    const photoIndex = gameData.photos.findIndex(photo => photo.id === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const oldName = gameData.photos[photoIndex].person;
    gameData.photos[photoIndex].person = newName;

    // Update names list
    if (!gameData.names.includes(newName)) {
      gameData.names.push(newName);
    }

    // Remove old name if no other photos use it
    const nameStillUsed = gameData.photos.some(photo => photo.person === oldName);
    if (!nameStillUsed && oldName !== newName) {
      gameData.names = gameData.names.filter(name => name !== oldName);
    }

    // Save updated data
    const updatedContent = Buffer.from(JSON.stringify(gameData, null, 2)).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
      message: `Update photo name from ${oldName} to ${newName}`,
      content: updatedContent,
      sha: data.sha,
    });

    // Notify all clients via Pusher
    await pusher.trigger('baby-game', 'photo-updated', {
      photoId,
      newName,
      names: gameData.names,
    });

    res.json({ 
      success: true,
      message: 'Photo updated successfully'
    });

  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({ error: error.message });
  }
}