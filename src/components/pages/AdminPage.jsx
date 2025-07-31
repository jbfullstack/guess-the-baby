import React, { useState, useEffect } from 'react';
import { useGame } from '../../hooks/useGame';
import { useRealtimeVotes } from '../../hooks/useRealtimeVotes';
import { usePlayerManager } from '../../hooks/usePlayerManager';
import { usePhotoManager } from '../../hooks/usePhotoManager';

import AdminHeader from './admin/AdminHeader';
import GameSettings from './admin/GameSettings';
import PlayersManager from './admin/PlayersManager';
import GameController from './admin/GameController';
import PhotosManager from './admin/PhotosManager';

import { DEFAULT_TIME_PER_ROUND } from '../../constants.js';

const AdminPage = () => {
  const { gameState, actions, onlineStatus } = useGame();
  
  // Initialize gameSettings with default values and sync with gameState
  const [gameSettings, setGameSettings] = useState({
    timePerPhoto: DEFAULT_TIME_PER_ROUND,
    ...gameState.gameSettings
  });
  
  // Sync gameSettings with gameState when it changes
  useEffect(() => {
    if (gameState.gameSettings) {
      setGameSettings(prev => ({
        ...prev,
        ...gameState.gameSettings
      }));
    }
  }, [gameState.gameSettings]);
  
  // Debug: Log current gameSettings
  useEffect(() => {
    console.log('🎮 [ADMIN PAGE] Current gameSettings:', gameSettings);
  }, [gameSettings]);
  
  // Custom hooks for business logic
  const realtimeVotes = useRealtimeVotes(gameState);
  const playerManager = usePlayerManager(gameState, realtimeVotes.setShuffleMessage);
  
  // Pass gameSettings to photoManager
  const photoManager = usePhotoManager(gameState, actions, realtimeVotes.setShuffleMessage, gameSettings);

  // Calculate player statistics for AdminHeader
  const totalPlayers = gameState.players.length;
  
  // For connected players - use online status if available, otherwise assume all joined players are connected
  const totalConnectedPlayers = onlineStatus?.connectedPlayers || 
                                realtimeVotes.liveTotalPlayers || 
                                totalPlayers; // Fallback: assume joined = connected
  
  // For active players - those currently voting or participating
  const totalActivePlayers = onlineStatus?.activePlayers || 
                            realtimeVotes.liveVoteCount || 
                            (gameState.gameMode === 'playing' ? realtimeVotes.getCurrentVotes().length : 0);

  // Debug logging for player statistics
  useEffect(() => {
    console.log('📊 Admin Panel Player Stats:', {
      totalActivePlayers,
      totalConnectedPlayers, 
      totalPlayers,
      gameMode: gameState.gameMode,
      onlineStatus,
      liveVoteCount: realtimeVotes.liveVoteCount,
      liveTotalPlayers: realtimeVotes.liveTotalPlayers
    });
  }, [totalActivePlayers, totalConnectedPlayers, totalPlayers, gameState.gameMode, onlineStatus, realtimeVotes.liveVoteCount, realtimeVotes.liveTotalPlayers]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header with player statistics */}
        <AdminHeader 
          actions={actions}
          totalActivePlayers={totalActivePlayers}
          totalConnectedPlayers={totalConnectedPlayers}
          totalPlayers={totalPlayers}
        />

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Game settings */}
          <GameSettings 
            gameSettings={gameSettings}
            setGameSettings={setGameSettings}
          />
          
          {/* Player management */}
          <PlayersManager 
            gameState={gameState}
            playerManager={playerManager}
          />

          {/* Game control */}
          <GameController 
            gameState={gameState}
            actions={actions}
            selectedPhotos={photoManager.selectedPhotos}
            photoOrder={photoManager.photoOrder}
            gameSettings={gameSettings} // Pass correct settings
            realtimeVotes={realtimeVotes}
            photoManager={photoManager} // Pass photoManager for startGame access
          />
        </div>

        {/* Photo management */}
        <PhotosManager 
          photoManager={photoManager}
          shuffleMessage={realtimeVotes.shuffleMessage}
        />
      </div>
    </div>
  );
};

export default AdminPage;