import React, { useState, useEffect } from 'react';
import { Play, Settings, Users, Image, Check, X, Shuffle, Eye, EyeOff, Edit3, Trash2, Save } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Pusher from 'pusher-js';

const AdminPage = () => {
  const { gameState, actions } = useGame();
  const [gameSettings, setGameSettings] = useState({
    timePerPhoto: 10,
    basePoints: 100,
    speedBonus: 50,
    orderBonus: 25,
    ...gameState.gameSettings
  });
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showVotes, setShowVotes] = useState(false);
  const [shuffleMessage, setShuffleMessage] = useState('');
  const [photoOrder, setPhotoOrder] = useState([]);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editName, setEditName] = useState('');
  
  // États pour les votes en temps réel
  const [liveVotes, setLiveVotes] = useState({});
  const [liveVoteCount, setLiveVoteCount] = useState(0);
  const [liveTotalPlayers, setLiveTotalPlayers] = useState(0);
  
  // Use real photos from gameState instead of mock data
  const allPhotos = gameState.photos;

  // Setup Pusher pour admin
  useEffect(() => {
    let pusher = null;
    let channel = null;

    const setupAdminPusher = () => {
      try {
        console.log('[ADMIN] 🚀 Setting up Pusher connection...');
        
        pusher = new Pusher('c9eb0b76bcbe61c6a397', {
          cluster: 'eu',
          encrypted: true
        });

        channel = pusher.subscribe('baby-game');
        
        // Listen for vote updates
        channel.bind('vote-update', (data) => {
          console.log('[ADMIN] 🗳️ Vote update received:', data);
          setLiveVotes(data.votes || {});
          setLiveVoteCount(data.votesCount || 0);
          setLiveTotalPlayers(data.totalPlayers || 0);
          
          // Update shuffle message pour feedback visuel
          setShuffleMessage(`📊 Live votes: ${data.votesCount || 0}/${data.totalPlayers || 0}`);
          setTimeout(() => setShuffleMessage(''), 2000);
        });

        // Listen for round ended
        channel.bind('round-ended', (data) => {
          console.log('[ADMIN] 🔄 Round ended:', data);
          // Clear votes for next round
          setLiveVotes({});
          setLiveVoteCount(0);
        });

        // Listen for game reset
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

    // Cleanup
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

  // Fonction pour obtenir les votes actuels (combinant gameState et live)
  const getCurrentVotes = () => {
    // Priorité aux votes live, fallback sur gameState
    const currentVotes = Object.keys(liveVotes).length > 0 ? liveVotes : (gameState.votes || {});
    
    // Convert votes object to array for display
    const votesArray = Object.entries(currentVotes).map(([player, answer]) => ({
      player,
      answer,
      correct: null // We don't know correct answer during voting
    }));
    
    console.log('[ADMIN] Current votes:', { 
      liveVotes, 
      gameStateVotes: gameState.votes, 
      finalVotes: currentVotes, 
      votesArray 
    });
    
    return votesArray;
  };

  const displayVotes = getCurrentVotes();
  const totalVotes = Object.keys(liveVotes).length > 0 ? liveVoteCount : displayVotes.length;
  const totalPlayers = liveTotalPlayers > 0 ? liveTotalPlayers : gameState.players.length;

  // PLAYER MANAGEMENT FUNCTIONS
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
        // Remove each player individually
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

  const resetGame = async () => {
    if (window.confirm('Are you sure you want to reset the game? This will:\n• Clear all players\n• Stop current game\n• Reset all scores\n\nThis action cannot be undone.')) {
      try {
        await actions.resetGame('hard');
        setShuffleMessage('🔄 Game reset successfully - all players cleared');
        setTimeout(() => setShuffleMessage(''), 3000);
      } catch (error) {
        alert('Failed to reset game: ' + error.message);
      }
    }
  };

  // Fonction pour nettoyer les votes corrompus
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

  // PHOTO MANAGEMENT FUNCTIONS
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
            <div className="flex space-x-2">
              {/* Debug info */}
              <div className="text-xs text-gray-400">
                Live: {totalVotes}/{totalPlayers}
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
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Game Settings - UPDATED WITH CONFIGURABLE SCORING */}
          <Card>
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Game Settings</h2>
            </div>
            
            <div className="space-y-4">
              {/* Timer Settings */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Time per photo (seconds)</label>
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
                <p className="text-xs text-gray-400 mt-1">Game auto-advances to next round after all players vote</p>
              </div>

              {/* Scoring Settings - NOUVEAU */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <h3 className="text-purple-400 font-medium mb-3 text-sm">🎯 Scoring System</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-300 mb-1 text-xs">Base Points</label>
                    <input
                      type="number"
                      min="50"
                      max="200"
                      value={gameSettings.basePoints || 100}
                      onChange={(e) => setGameSettings(prev => ({ 
                        ...prev, 
                        basePoints: parseInt(e.target.value) || 100 
                      }))}
                      className="w-full px-2 py-1 text-sm rounded bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Correct answer</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1 text-xs">Speed Bonus</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={gameSettings.speedBonus || 50}
                      onChange={(e) => setGameSettings(prev => ({ 
                        ...prev, 
                        speedBonus: parseInt(e.target.value) || 50 
                      }))}
                      className="w-full px-2 py-1 text-sm rounded bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Fast answers</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1 text-xs">Order Bonus</label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={gameSettings.orderBonus || 25}
                      onChange={(e) => setGameSettings(prev => ({ 
                        ...prev, 
                        orderBonus: parseInt(e.target.value) || 25 
                      }))}
                      className="w-full px-2 py-1 text-sm rounded bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">First correct</p>
                  </div>
                </div>
                
                {/* Score Preview */}
                <div className="mt-3 bg-black/20 rounded p-2">
                  <p className="text-xs text-gray-300">
                    <span className="text-purple-400">Max possible:</span> {(gameSettings.basePoints || 100) + (gameSettings.speedBonus || 50) + (gameSettings.orderBonus || 25)} pts
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-purple-400">Min correct:</span> {gameSettings.basePoints || 100} pts
                  </p>
                </div>
              </div>

              {/* Exemples de scoring */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <h4 className="text-blue-400 text-xs font-medium mb-2">💡 Scoring Examples:</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <p>🥇 <strong>First + Fast:</strong> {gameSettings.basePoints || 100} + {gameSettings.speedBonus || 50} + {gameSettings.orderBonus || 25} = {(gameSettings.basePoints || 100) + (gameSettings.speedBonus || 50) + (gameSettings.orderBonus || 25)} pts</p>
                  <p>⚡ <strong>Fast + Second:</strong> {gameSettings.basePoints || 100} + {Math.round((gameSettings.speedBonus || 50) * 0.8)} + {Math.round((gameSettings.orderBonus || 25) * 0.5)} = {(gameSettings.basePoints || 100) + Math.round((gameSettings.speedBonus || 50) * 0.8) + Math.round((gameSettings.orderBonus || 25) * 0.5)} pts</p>
                  <p>🐌 <strong>Slow + Correct:</strong> {gameSettings.basePoints || 100} + 0 + 0 = {gameSettings.basePoints || 100} pts</p>
                  <p>❌ <strong>Wrong answer:</strong> 0 pts</p>
                </div>
              </div>
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
                    onClick={clearAllPlayers}
                    title="Remove all players (keeps game state)"
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
              
              <Button 
                variant="danger" 
                size="lg" 
                className="w-full"
                onClick={resetGame}
              >
                🔄 Reset Game
              </Button>

              {/* Cleanup button */}
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full"
                onClick={cleanupCorruptedVotes}
              >
                🧹 Clean Vote Data
              </Button>
              
              {/* LIVE VOTES SECTION */}
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
                    <div className="bg-white/5 rounded-lg p-3 space-y-1">
                      {/* Debug info */}
                      <div className="text-xs text-yellow-400 mb-2 font-mono bg-black/20 p-1 rounded">
                        Debug: Live={Object.keys(liveVotes).length} | State={Object.keys(gameState.votes || {}).length} | Count={totalVotes}/{totalPlayers}
                      </div>
                      
                      {/* Current Round Info */}
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2 pb-1 border-b border-white/10">
                        <span>Round {gameState.currentRound || 1}</span>
                        <span>{totalVotes}/{totalPlayers} voted</span>
                      </div>
                      
                      {/* Real Votes Display */}
                      {displayVotes.length > 0 ? (
                        <div className="space-y-1">
                          {displayVotes.map((vote, index) => (
                            <div key={`${vote.player}-${index}`} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                                  {vote.player.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-white font-medium">{vote.player}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-300 font-medium">{vote.answer}</span>
                                <div className="w-2 h-2 bg-green-400 rounded-full" title="Vote received"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-gray-400 text-sm">No votes yet this round</p>
                          <p className="text-gray-500 text-xs mt-1">Votes will appear here as players answer</p>
                        </div>
                      )}
                      
                      {/* Progress Bar */}
                      {totalPlayers > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/20">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Voting Progress</span>
                            <span>{Math.round((totalVotes / totalPlayers) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-purple-400 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${(totalVotes / totalPlayers) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* All Voted Indicator */}
                      {totalVotes >= totalPlayers && totalPlayers > 0 && (
                        <div className="mt-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2">
                          <p className="text-green-400 text-xs text-center font-medium">
                            ✅ All players have voted! Round ending soon...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Game Status */}
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