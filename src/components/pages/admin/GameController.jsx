import React, { useState } from 'react';
import { Play, Eye, EyeOff } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import LiveVotesDisplay from './LiveVotesDisplay';

const GameController = ({ 
  gameState, 
  actions, 
  selectedPhotos, 
  photoOrder, 
  gameSettings,
  realtimeVotes
}) => {
  const [showVotes, setShowVotes] = useState(false);
  const { cleanupCorruptedVotes } = realtimeVotes;

  const resetGame = async () => {
    if (window.confirm('Are you sure you want to reset the game? This will:\n• Clear all players\n• Stop current game\n• Reset all scores\n\nThis action cannot be undone.')) {
      try {
        await actions.resetGame('hard');
        realtimeVotes.setShuffleMessage('🔄 Game reset successfully - all players cleared');
        setTimeout(() => realtimeVotes.setShuffleMessage(''), 3000);
      } catch (error) {
        alert('Failed to reset game: ' + error.message);
      }
    }
  };

  const startGame = async () => {
    const selectedPhotosList = photoOrder.filter(photo => selectedPhotos.includes(photo.id));
    
    if (selectedPhotosList.length === 0) {
      alert('Please select at least one photo for the game');
      return;
    }

    if (gameState.players.length === 0) {
      alert('No players have joined the game yet');
      return;
    }

    try {
      await actions.startGame({
        ...gameSettings,
        selectedPhotos: selectedPhotosList
      });
    } catch (error) {
      alert('Failed to start game: ' + error.message);
    }
  };

  const { getCurrentVotes, liveVoteCount, liveTotalPlayers } = realtimeVotes;
  const displayVotes = getCurrentVotes();
  const totalVotes = liveVoteCount || displayVotes.length;
  const totalPlayers = liveTotalPlayers || gameState.players.length;

  // Game status for collapsed title
  const gameStatus = gameState.gameMode === 'playing' ? 'Playing' : 
                    gameState.gameMode === 'finished' ? 'Finished' : 
                    gameState.gameMode === 'waiting' ? 'Ready' : 'Paused';

  return (
    <Card
      title="Game Control"
      collapsedTitle={`Game Control (${selectedPhotos.length} photos, ${gameStatus})`}
      collapsibleOnlyOnMobile={true}
      defaultExpanded={true}
      icon={<Play className="w-5 h-5" />}
    >
      <div className="space-y-3">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-sm text-gray-300 mb-1">Selected Photos</p>
          <p className="text-2xl font-bold text-white">{selectedPhotos.length}</p>
        </div>
        
        <Button 
          size="lg" 
          className="w-full"
          onClick={startGame}
          disabled={gameState.players.length === 0 || selectedPhotos.length === 0}
        >
          <Play className="w-5 h-5 mr-2" />
          Start Game
        </Button>
        
        <Button 
          variant="danger" 
          size="lg" 
          className="w-full"
          onClick={resetGame}
        >
          🔄 Reset Game
        </Button>

        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={cleanupCorruptedVotes}
        >
          🧹 Clean Vote Data
        </Button>
        
        {gameState.gameMode === 'playing' && (
          <div className="space-y-2">
            <Button 
              variant="secondary" 
              size="sm" 
              className="w-full"
              onClick={() => setShowVotes(!showVotes)}
            >
              {showVotes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showVotes ? 'Hide' : 'Show'} Live Votes ({totalVotes}/{totalPlayers})
            </Button>
            
            {showVotes && (
              <LiveVotesDisplay 
                displayVotes={displayVotes}
                totalVotes={totalVotes}
                totalPlayers={totalPlayers}
                gameState={gameState}
                realtimeVotes={realtimeVotes}
              />
            )}
          </div>
        )}
        
        {gameState.gameMode !== 'waiting' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
            <p className="text-blue-400 text-xs text-center">
              Game Status: {gameState.gameMode === 'playing' ? '🎮 In Progress' : 
                          gameState.gameMode === 'finished' ? '🏁 Finished' : '⏸️ Paused'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GameController;