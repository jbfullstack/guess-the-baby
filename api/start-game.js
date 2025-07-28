import Pusher from 'pusher';

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

  try {
    const { settings, selectedPhotos } = req.body;

    // Pas de check de players - on assume qu'il y en a
    // (le check sera côté React)

    if (!selectedPhotos || selectedPhotos.length === 0) {
      return res.status(400).json({ error: 'No photos selected for the game' });
    }

    // Start le game
    await pusher.trigger('baby-game', 'game-started', {
      gameId: Date.now().toString(),
      photo: {
        ...selectedPhotos[0],
        correctAnswer: undefined, // Don't send correct answer
      },
      settings: settings || { timePerPhoto: 10, autoNext: true },
      totalPhotos: selectedPhotos.length,
      currentRound: 1,
    });

    res.json({ 
      success: true,
      message: 'Game started successfully'
    });

  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: error.message });
  }
}