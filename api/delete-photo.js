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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({ error: 'Photo ID is required' });
    }

    // Get current game data
    const { data } = await octokit.rest.repos.getContent({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
    });
    
    const gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    
    // Find the photo to delete
    const photoIndex = gameData.photos.findIndex(photo => photo.id === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoToDelete = gameData.photos[photoIndex];
    const fileName = photoToDelete.url.split('/').pop();

    // Delete photo file from GitHub
    try {
      const photoFile = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: `photos/${fileName}`,
      });

      await octokit.rest.repos.deleteFile({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: `photos/${fileName}`,
        message: `Delete photo: ${fileName}`,
        sha: photoFile.data.sha,
      });
    } catch (error) {
      console.warn('Photo file not found in repository:', fileName);
    }

    // Remove photo from data
    gameData.photos.splice(photoIndex, 1);

    // Clean up names list - remove names no longer used
    const usedNames = [...new Set(gameData.photos.map(photo => photo.person))];
    gameData.names = gameData.names.filter(name => usedNames.includes(name));

    // Save updated data
    const updatedContent = Buffer.from(JSON.stringify(gameData, null, 2)).toString('base64');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
      message: `Delete photo: ${photoToDelete.person}`,
      content: updatedContent,
      sha: data.sha,
    });

    // Notify all clients via Pusher
    await pusher.trigger('baby-game', 'photo-deleted', {
      photoId,
      names: gameData.names,
    });

    res.json({ 
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: error.message });
  }
}