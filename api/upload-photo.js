import { Octokit } from '@octokit/rest';
import Pusher from 'pusher';
import { IncomingForm } from 'formidable';
import fs from 'fs';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data with corrected formidable syntax
    const form = new IncomingForm();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    
    // Handle both array and single values
    const personName = Array.isArray(fields.personName) ? fields.personName[0] : fields.personName;
    const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

    if (!photoFile || !personName) {
      return res.status(400).json({ error: 'Photo and person name are required' });
    }

    // Validate file size (5MB max)
    if (photoFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    // Read file as base64
    const fileBuffer = fs.readFileSync(photoFile.filepath);
    const base64Content = fileBuffer.toString('base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = personName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}.jpg`;
    
    // Upload to GitHub
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: `photos/${fileName}`,
      message: `Add baby photo for ${personName}`,
      content: base64Content,
    });

    // Get/update game data
    let gameData = { photos: [], names: [] };
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameData.json',
      });
      gameData = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      // File doesn't exist yet, use defaults
      console.log('Creating new gameData.json file');
    }

    // Add new photo to data
    const photoUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/main/photos/${fileName}`;
    const newPhoto = {
      id: timestamp.toString(),
      url: photoUrl,
      person: personName,
      uploadedBy: personName,
      uploadedAt: new Date().toISOString(),
    };
    
    gameData.photos.push(newPhoto);

    // Add name if not exists
    if (!gameData.names.includes(personName)) {
      gameData.names.push(personName);
    }

    // Update gameData.json
    const updatedContent = Buffer.from(JSON.stringify(gameData, null, 2)).toString('base64');
    
    let sha;
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner: process.env.GITHUB_REPO_OWNER,
        repo: process.env.GITHUB_REPO_NAME,
        path: 'gameData.json',
      });
      sha = existingFile.data.sha;
    } catch (error) {
      // File doesn't exist, will create new one
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPO_OWNER,
      repo: process.env.GITHUB_REPO_NAME,
      path: 'gameData.json',
      message: 'Update game data after photo upload',
      content: updatedContent,
      ...(sha && { sha }),
    });

    // Notify all clients via Pusher
    try {
      await pusher.trigger('baby-game', 'photo-uploaded', {
        photo: newPhoto,
        names: gameData.names,
      });
    } catch (pusherError) {
      console.warn('Pusher notification failed:', pusherError);
    }

    res.json({ 
      success: true, 
      photo: newPhoto,
      names: gameData.names 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}