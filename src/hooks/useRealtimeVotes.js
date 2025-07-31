import { useState, useEffect } from 'react';
import Pusher from 'pusher-js';
import { PUSHER_ID } from '../constants.js';

export const useRealtimeVotes = (gameState) => {
  const [liveVotes, setLiveVotes] = useState({});
  const [liveVoteCount, setLiveVoteCount] = useState(0);
  const [liveTotalPlayers, setLiveTotalPlayers] = useState(0);
  const [shuffleMessage, setShuffleMessage] = useState('');

  useEffect(() => {
    let pusher = null;
    let channel = null;

    const setupAdminPusher = () => {
      try {
        console.log('[ADMIN] 🚀 Setting up Pusher connection...');
        
        pusher = new Pusher(PUSHER_ID, {
          cluster: 'eu',
          encrypted: true
        });

        channel = pusher.subscribe('baby-game');
        
        channel.bind('vote-update', (data) => {
          console.log('[ADMIN] 🗳️ Vote update received:', data);
          setLiveVotes(data.votes || {});
          setLiveVoteCount(data.votesCount || 0);
          setLiveTotalPlayers(data.totalPlayers || 0);
          
          setShuffleMessage(`📊 Live votes: ${data.votesCount || 0}/${data.totalPlayers || 0}`);
          setTimeout(() => setShuffleMessage(''), 2000);
        });

        channel.bind('round-ended', (data) => {
          console.log('[ADMIN] 🔄 Round ended:', data);
          setLiveVotes({});
          setLiveVoteCount(0);
        });

        channel.bind('game-reset', (data) => {
          console.log('[ADMIN] 🔄 Game reset:', data);
          setLiveVotes({});
          setLiveVoteCount(0);
          setLiveTotalPlayers(0);
        });

        console.log('[ADMIN] ✅ Pusher events bound successfully');
        
      } catch (error) {
        console.error('[ADMIN] ❌ Failed to setup Pusher:', error);
      }
    };

    setupAdminPusher();

    return () => {
      if (channel) {
        channel.unbind_all();
        pusher.unsubscribe('baby-game');
      }
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  const getCurrentVotes = () => {
    const currentVotes = Object.keys(liveVotes).length > 0 ? liveVotes : (gameState.votes || {});
    
    const votesArray = Object.entries(currentVotes).map(([player, answer]) => ({
      player,
      answer,
      correct: null
    }));
    
    return votesArray;
  };

  const cleanupCorruptedVotes = async () => {
    if (window.confirm('🧹 Clean corrupted vote data?\n\nThis will clear all current votes but keep players and game state.')) {
      try {
        const response = await fetch('/api/redis-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        
        if (result.success) {
          setShuffleMessage('🧹 Vote data cleaned successfully!');
          setLiveVotes({});
          setLiveVoteCount(0);
          setTimeout(() => setShuffleMessage(''), 3000);
        } else {
          alert('❌ Cleanup failed: ' + result.error);
        }
      } catch (error) {
        alert('❌ Cleanup failed: ' + error.message);
      }
    }
  };

  return {
    liveVotes,
    liveVoteCount,
    liveTotalPlayers,
    shuffleMessage,
    setShuffleMessage,
    getCurrentVotes,
    cleanupCorruptedVotes
  };
};