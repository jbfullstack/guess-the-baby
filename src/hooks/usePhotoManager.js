import { useState, useEffect } from 'react';

export const usePhotoManager = (gameState, actions, setShuffleMessage, gameSettings) => {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoOrder, setPhotoOrder] = useState([]);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editName, setEditName] = useState('');

  const allPhotos = gameState.photos;

  useEffect(() => {
    actions.refreshPhotos();
  }, []);

  useEffect(() => {
    if (allPhotos.length > 0) {
      setPhotoOrder([...allPhotos]);
      setSelectedPhotos(allPhotos.map(photo => photo.id));
    }
  }, [allPhotos]);

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotos(allPhotos.map(photo => photo.id));
  };

  const clearAllPhotos = () => {
    setSelectedPhotos([]);
  };

  const shufflePhotos = () => {
    const shuffled = [...photoOrder].sort(() => Math.random() - 0.5);
    setPhotoOrder(shuffled);
    
    setShuffleMessage('✅ Photos have been randomized! This is the order players will see.');
    setTimeout(() => setShuffleMessage(''), 4000);
  };

  const resetOrder = () => {
    setPhotoOrder([...allPhotos]);
    setShuffleMessage('↩️ Reset to original order');
    setTimeout(() => setShuffleMessage(''), 3000);
  };

  const deletePhoto = async (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      try {
        await actions.deletePhoto(photoId);
        
        setPhotoOrder(prev => prev.filter(photo => photo.id !== photoId));
        setSelectedPhotos(prev => prev.filter(id => id !== photoId));
        
        setShuffleMessage('🗑️ Photo deleted successfully');
        setTimeout(() => setShuffleMessage(''), 3000);
      } catch (error) {
        alert('Failed to delete photo: ' + error.message);
      }
    }
  };

  const startEditingName = (photo) => {
    setEditingPhoto(photo.id);
    setEditName(photo.person);
  };

  const saveEditedName = async (photoId) => {
    if (!editName.trim()) {
      alert('Name cannot be empty');
      return;
    }

    try {
      await actions.updatePhoto(photoId, editName.trim());
      
      setPhotoOrder(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, person: editName.trim() }
          : photo
      ));
      
      setEditingPhoto(null);
      setEditName('');
      setShuffleMessage('✏️ Name updated successfully');
      setTimeout(() => setShuffleMessage(''), 3000);
    } catch (error) {
      alert('Failed to update name: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingPhoto(null);
    setEditName('');
  };

  // 🎮 NEW: Fonction pour démarrer le jeu avec les paramètres corrects
  const startGame = async () => {
    if (selectedPhotos.length === 0) {
      alert('Please select at least one photo to start the game');
      return;
    }

    if (gameState.players.length === 0) {
      alert('No players have joined the game yet');
      return;
    }

    try {
      // Construire la liste des photos sélectionnées dans l'ordre choisi
      const photosToPlay = photoOrder.filter(photo => selectedPhotos.includes(photo.id));
      
      console.log('🎮 [PHOTO MANAGER] Starting game with settings:', gameSettings);
      console.log('🎮 [PHOTO MANAGER] Selected photos:', photosToPlay.length);
      console.log('🎮 [PHOTO MANAGER] timePerPhoto:', gameSettings?.timePerPhoto);
      
      const requestBody = {
        selectedPhotos: photosToPlay,
        timePerPhoto: gameSettings?.timePerPhoto || 10 // FIX: Utiliser les paramètres de jeu
      };
      
      console.log('🎮 [PHOTO MANAGER] Request body:', requestBody);
      
      const response = await fetch('/api/start-game-redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      console.log('🎮 [PHOTO MANAGER] Start game result:', result);
      
      if (result.success) {
        setShuffleMessage(`🎮 Game started! ${result.totalPhotos} photos, ${result.playersCount} players, ${gameSettings?.timePerPhoto || 10}s per round`);
        setTimeout(() => setShuffleMessage(''), 4000);
        
        // Optionnel : Mettre à jour l'état local du jeu
        actions.updateGameState({
          gameMode: 'playing',
          gameId: result.gameId,
          selectedPhotos: photosToPlay,
          settings: { timePerPhoto: gameSettings?.timePerPhoto || 10 }
        });
      } else {
        alert('Failed to start game: ' + result.error);
      }
    } catch (error) {
      console.error('🎮 [PHOTO MANAGER] Error starting game:', error);
      alert('Failed to start game: ' + error.message);
    }
  };

  // 🔍 HELPER: Obtenir les photos sélectionnées dans l'ordre
  const getSelectedPhotosInOrder = () => {
    return photoOrder.filter(photo => selectedPhotos.includes(photo.id));
  };

  // 🔍 HELPER: Vérifier si le jeu peut démarrer
  const canStartGame = () => {
    return selectedPhotos.length > 0 && gameState.players.length > 0;
  };

  return {
    selectedPhotos,
    photoOrder,
    editingPhoto,
    editName,
    setEditName,
    togglePhotoSelection,
    selectAllPhotos,
    clearAllPhotos,
    shufflePhotos,
    resetOrder,
    deletePhoto,
    startEditingName,
    saveEditedName,
    cancelEdit,
    // 🎮 NEW: Nouvelles fonctions
    startGame,
    getSelectedPhotosInOrder,
    canStartGame
  };
};