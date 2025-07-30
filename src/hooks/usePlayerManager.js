export const usePlayerManager = (gameState, setShuffleMessage) => {
  const removePlayer = async (playerName) => {
    if (window.confirm(`Are you sure you want to remove player "${playerName}" from the game?`)) {
      try {
        const response = await fetch('/api/reset-game-state-redis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'removePlayer',
            playerName: playerName
          }),
        });

        const result = await response.json();
        
        if (result.success) {
          setShuffleMessage(`🚪 Player "${playerName}" removed successfully`);
          setTimeout(() => setShuffleMessage(''), 3000);
        } else {
          alert('Failed to remove player: ' + result.error);
        }
      } catch (error) {
        alert('Failed to remove player: ' + error.message);
      }
    }
  };

  const clearAllPlayers = async () => {
    if (window.confirm(`Remove ALL ${gameState.players.length} players from the game?\n\nThis will NOT reset the game state, only remove players.`)) {
      try {
        const playerNames = gameState.players.map(p => p.name || p);
        
        for (const playerName of playerNames) {
          await fetch('/api/reset-game-state-redis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'removePlayer',
              playerName: playerName
            }),
          });
        }
        
        setShuffleMessage(`🧹 All ${playerNames.length} players removed successfully`);
        setTimeout(() => setShuffleMessage(''), 3000);
        
      } catch (error) {
        alert('Failed to clear all players: ' + error.message);
      }
    }
  };

  return {
    removePlayer,
    clearAllPlayers
  };
};