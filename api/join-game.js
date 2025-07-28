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
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Juste notifier via Pusher
    await pusher.trigger('baby-game', 'player-joined', {
      player: { 
        name: playerName.trim(),
        id: Date.now().toString(),
        joinedAt: new Date().toISOString()
      }
    });

    res.json({ 
      success: true,
      message: 'Joined game successfully'
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: error.message });
  }
}