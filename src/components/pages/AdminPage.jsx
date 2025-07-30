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

const AdminPage = () => {
  const { gameState, actions } = useGame();
  
  // FIX: Initialisation correcte avec valeurs par défaut et synchronisation
  const [gameSettings, setGameSettings] = useState({
    timePerPhoto: 10,
    ...gameState.gameSettings
  });
  
  // FIX: Synchroniser gameSettings avec gameState quand il change
  useEffect(() => {
    if (gameState.gameSettings) {
      setGameSettings(prev => ({
        ...prev,
        ...gameState.gameSettings
      }));
    }
  }, [gameState.gameSettings]);
  
  // Debug: Log des paramètres actuels
  useEffect(() => {
    console.log('🎮 [ADMIN PAGE] Current gameSettings:', gameSettings);
  }, [gameSettings]);
  
  // Hooks personnalisés pour la logique métier
  const realtimeVotes = useRealtimeVotes(gameState);
  const playerManager = usePlayerManager(gameState, realtimeVotes.setShuffleMessage);
  
  // FIX: Passer gameSettings au photoManager
  const photoManager = usePhotoManager(gameState, actions, realtimeVotes.setShuffleMessage, gameSettings);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <AdminHeader 
          actions={actions}
          totalVotes={realtimeVotes.liveVoteCount || realtimeVotes.getCurrentVotes().length}
          totalPlayers={realtimeVotes.liveTotalPlayers || gameState.players.length}
        />

        {/* Grid principal */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Paramètres du jeu */}
          <GameSettings 
            gameSettings={gameSettings}
            setGameSettings={setGameSettings}
          />
          
          {/* Gestion des joueurs */}
          <PlayersManager 
            gameState={gameState}
            playerManager={playerManager}
          />

          {/* Contrôle du jeu */}
          <GameController 
            gameState={gameState}
            actions={actions}
            selectedPhotos={photoManager.selectedPhotos}
            photoOrder={photoManager.photoOrder}
            gameSettings={gameSettings} // FIX: Passer les bons paramètres
            realtimeVotes={realtimeVotes}
            photoManager={photoManager} // FIX: Passer photoManager pour accéder à startGame
          />
        </div>

        {/* Gestion des photos */}
        <PhotosManager 
          photoManager={photoManager}
          shuffleMessage={realtimeVotes.shuffleMessage}
        />
      </div>
    </div>
  );
};

export default AdminPage;