import React, { useState, useEffect } from 'react';
import { Play, Settings, Users, Image, Check, X, Shuffle, Eye, EyeOff, Edit3, Trash2, Save } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AdminPage = () => {
  const { gameState, actions } = useGame();
  const [gameSettings, setGameSettings] = useState(gameState.gameSettings);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showVotes, setShowVotes] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState('');
  const [photoOrder, setPhotoOrder] = useState([]);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Use real photos from gameState instead of mock data
  const allPhotos = gameState.photos;

  useEffect(() => {
    // Load photos from backend when component mounts
    actions.refreshPhotos();
  }, []);

  useEffect(() => {
    // Initialize with default order when photos are loaded
    if (allPhotos.length > 0) {
      setPhotoOrder([...allPhotos]);
      // Select all photos by default
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
    // Actually shuffle the display order
    const shuffled = [...photoOrder].sort(() => Math.random() - 0.5);
    setPhotoOrder(shuffled);
    
    setShuffleMessage('✅ Photos have been randomized! This is the order players will see.');
    
    // Clear message after 4 seconds
    setTimeout(() => {
      setShuffleMessage('');
    }, 4000);
  };

  const resetOrder = () => {
    // Reset to original order
    setPhotoOrder([...allPhotos]);
    setShuffleMessage('↩️ Reset to original order');
    
    setTimeout(() => {
      setShuffleMessage('');
    }, 3000);
  };

  const deletePhoto = async (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      try {
        // Call real API to delete from GitHub
        await actions.deletePhoto(photoId);
        
        // Remove from local state
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
      // Call real API to update GitHub
      await actions.updatePhoto(photoId, editName.trim());
      
      // Update local state
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

  // Ajouter cette fonction removePlayer avant le render dans AdminPage.jsx
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

  const cancelEdit = () => {
    setEditingPhoto(null);
    setEditName('');
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
      // Use the current display order (which might be shuffled)
      await actions.startGame({
        ...gameSettings,
        selectedPhotos: selectedPhotosList // Photos in the exact order shown to admin
      });
    } catch (error) {
      alert('Failed to start game: ' + error.message);
    }
  };

  const mockVotes = [
    { player: 'Alice', answer: 'Bob', correct: false },
    { player: 'Bob', answer: 'Charlie', correct: true },
    { player: 'Charlie', answer: 'Alice', correct: false },
  ];

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
              <p className="text-gray-300">Manage your baby photo guessing game</p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => {
                actions.authenticateAdmin(false);
              }}
            >
              Exit Admin
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Game Settings */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Game Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Time per photo (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={gameSettings.timePerPhoto}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    timePerPhoto: parseInt(e.target.value) || 10 
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                />
              </div>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={gameSettings.autoNext}
                  onChange={(e) => setGameSettings(prev => ({ 
                    ...prev, 
                    autoNext: e.target.checked 
                  }))}
                  className="w-4 h-4 text-purple-600 bg-transparent rounded border-gray-400"
                />
                <span className="text-gray-300 text-sm">Auto advance to next photo</span>
              </label>
            </div>
          </Card>
          
         {/* Players */}
        <Card>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">
                Players ({gameState.players.length})
            </h2>
            </div>
            
            {/* Players management buttons */}
            {gameState.players.length > 0 && (
            <div className="flex space-x-2">
                <Button 
                size="sm" 
                variant="danger" 
                onClick={() => {
                    if (window.confirm(`Remove ALL ${gameState.players.length} players from the game?`)) {
                    resetGame();
                    }
                }}
                title="Remove all players"
                >
                Clear All
                </Button>
            </div>
            )}
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
            {gameState.players.length > 0 ? (
            gameState.players.map((player, index) => (
                <div key={player.name || index} className="flex items-center justify-between bg-white/5 rounded-lg p-3 group hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                    <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                        {(player.name || player).charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span className="text-white font-medium block">
                        {player.name || player}
                        </span>
                        <span className="text-gray-400 text-xs">
                        {player.joinedAt ? new Date(player.joinedAt).toLocaleTimeString() : 'Recently joined'}
                        </span>
                    </div>
                    </div>
                </div>
                
                <div className="flex items-center space-x-3">
                    {/* Score */}
                    <div className="text-right">
                    <span className="text-white font-semibold">
                        {gameState.scores[player.name] || 0}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">pts</span>
                    </div>
                    
                    {/* Online indicator */}
                    <div className="w-2 h-2 bg-green-400 rounded-full" title="Online"></div>
                    
                    {/* Remove button - shows on hover */}
                    <button
                    onClick={() => removePlayer(player.name || player)}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-full"
                    title={`Remove ${player.name || player} from game`}
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))
            ) : (
            <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-400 mb-2">No players joined yet</p>
                <p className="text-gray-500 text-sm">Players will appear here when they join the game</p>
            </div>
            )}
        </div>
        
        {/* Players info footer */}
        {gameState.players.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                Total: {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''}
                </span>
                <span>
                Hover to remove individual players
                </span>
            </div>
            </div>
        )}
        </Card>

          {/* Game Control */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Play className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Game Control</h2>
            </div>
            
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
              
              {gameState.gameMode === 'playing' && (
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowVotes(!showVotes)}
                  >
                    {showVotes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showVotes ? 'Hide' : 'Show'} Live Votes
                  </Button>
                  
                  {showVotes && (
                    <div className="bg-white/5 rounded-lg p-3 space-y-1">
                      {mockVotes.map((vote, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-white">{vote.player}</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-300">{vote.answer}</span>
                            {vote.correct ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <X className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Photo Selection */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Image className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Manage Photos ({selectedPhotos.length}/{photoOrder.length} selected)
                </h2>
                <p className="text-sm text-gray-400">Select, edit names, delete photos, and arrange game order</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={shufflePhotos}
                title="Randomize the order that photos will appear in the game"
              >
                <Shuffle className="w-4 h-4 mr-1" />
                Shuffle Order
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={resetOrder}
                title="Reset to original upload order"
              >
                Reset Order
              </Button>
              <Button size="sm" variant="secondary" onClick={selectAllPhotos}>
                Select All
              </Button>
              <Button size="sm" variant="danger" onClick={clearAllPhotos}>
                Clear All
              </Button>
            </div>
          </div>
          
          {/* Shuffle Message */}
          {shuffleMessage && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-400 text-sm text-center font-medium">{shuffleMessage}</p>
            </div>
          )}
          
          {/* Photo Management Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Image className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-400 font-medium mb-1">Photo Management:</p>
                <div className="text-blue-300 space-y-1">
                  <p>• <strong>Click checkmark:</strong> Select/deselect for game</p>
                  <p>• <strong>Hover & click edit (✏️):</strong> Change person's name</p>
                  <p>• <strong>Hover & click delete (🗑️):</strong> Remove photo permanently</p>
                  <p>• <strong>Order matters:</strong> #1 will be shown first in the game</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Game Order Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
            <p className="text-purple-400 text-sm text-center">
              📋 <strong>Game Preview:</strong> Photos will appear in the exact order shown below ({photoOrder.filter(photo => selectedPhotos.includes(photo.id)).length} selected)
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photoOrder.map((photo, index) => (
              <div 
                key={photo.id}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  selectedPhotos.includes(photo.id)
                    ? 'border-purple-400 ring-2 ring-purple-400/50'
                    : 'border-white/20 hover:border-purple-400/50 opacity-50'
                }`}
              >
                {/* Order Number */}
                {selectedPhotos.includes(photo.id) && (
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    #{photoOrder.filter((p, i) => i <= index && selectedPhotos.includes(p.id)).length}
                  </div>
                )}

                <img 
                  src={photo.url} 
                  alt={`Baby photo of ${photo.person}`}
                  className={`w-full h-32 object-cover transition-all ${
                    selectedPhotos.includes(photo.id) ? '' : 'grayscale group-hover:grayscale-0'
                  }`}
                />
                
                {/* Action Buttons */}
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPhotos.includes(photo.id)
                        ? 'bg-purple-400 border-purple-400'
                        : 'bg-white/20 border-white/50 hover:border-purple-400'
                    }`}
                    title={selectedPhotos.includes(photo.id) ? 'Deselect photo' : 'Select photo'}
                  >
                    {selectedPhotos.includes(photo.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingName(photo);
                    }}
                    className="w-6 h-6 rounded-full bg-blue-500/80 hover:bg-blue-500 flex items-center justify-center transition-colors"
                    title="Edit name"
                  >
                    <Edit3 className="w-3 h-3 text-white" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(photo.id);
                    }}
                    className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
                
                {/* Photo Info / Edit Form */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                  {editingPhoto === photo.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white/10 border border-white/30 rounded text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                        placeholder="Enter name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditedName(photo.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                      />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => saveEditedName(photo.id)}
                          className="flex-1 bg-green-500/80 hover:bg-green-500 text-white text-xs py-1 rounded transition-colors flex items-center justify-center"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-gray-500/80 hover:bg-gray-500 text-white text-xs py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-white text-xs font-medium">{photo.person}</p>
                      <p className="text-gray-300 text-xs">by {photo.uploadedBy}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {photoOrder.length === 0 && (
            <div className="text-center py-12">
              <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400 mb-2">No photos uploaded yet</p>
              <p className="text-gray-500 text-sm">Photos will appear here when users upload them</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;