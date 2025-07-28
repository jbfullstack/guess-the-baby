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
    const { gameId, playerName, answer } = req.body;

    if (!playerName || !answer) {
      return res.status(400).json({ error: 'Player name and answer are required' });
    }

    // Pas de check d'état - on assume que le game est actif
    // Juste envoyer le vote via Pusher
    await pusher.trigger('baby-game', 'vote-submitted', {
      player: playerName,
      answer,
      timestamp: Date.now(),
      gameId
    });

    res.json({ 
      success: true,
      message: 'Vote submitted successfully'
    });

  } catch (error) {
    console.error('Submit vote error:', error);
    res.status(500).json({ error: error.message });
  }
}