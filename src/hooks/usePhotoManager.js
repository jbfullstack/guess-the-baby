import { useState, useEffect } from 'react';

export const usePhotoManager = (gameState, actions, setShuffleMessage) => {
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
    cancelEdit
  };
};