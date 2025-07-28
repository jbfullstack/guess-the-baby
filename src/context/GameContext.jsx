import React, { createContext, useState, useEffect } from 'react';
import apiService from '../services/api';

export const GameContext = createContext();

// Initial game state
const initialState = {
  currentView: 'home',
  gameMode: 'waiting',
  currentPhoto: null,
  players: [],
  photos: [],
  names: ['Alice', 'Bob', 'Charlie', 'Diana'],
  scores: {},
  gameSettings: {
    timePerPhoto: 10,
    autoNext: true
  },
  isAdmin: false,
  isConnected: false,
  gameId: null,
  playerName: '',
  hasJoined: false,
  selectedAnswer: null,
  votes: [],
  gameHistory: []
};

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState(initialState);
  const [pusher, setPusher] = useState(null);
  const [gameChannel, setGameChannel] = useState(null);

  // Initialize Pusher connection and load photos
  useEffect(() => {
    initializePusher();
    loadPhotos();
    
    return () => {
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  const loadPhotos = async () => {
    try {
      const result = await apiService.getPhotos();
      if (result.success) {
        updateGameState({
          photos: result.photos,
          names: result.names
        });
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  };

  const initializePusher = async () => {
    try {
      // Mock Pusher for now - will be replaced with real Pusher
      const mockPusher = {
        subscribe: (channelName) => ({
          bind: (event, callback) => {
            console.log(`Listening for ${event} on ${channelName}`);
          },
          unbind: () => console.log('Unbound'),
        }),
        disconnect: () => console.log('Pusher disconnected')
      };

      setPusher(mockPusher);
      updateGameState({ isConnected: true });

      const channel = mockPusher.subscribe('baby-game');
      setGameChannel(channel);
      
      bindPusherEvents(channel);
    } catch (error) {
      console.error('Failed to initialize Pusher:', error);
      updateGameState({ isConnected: false });
    }
  };

  const bindPusherEvents = (channel) => {
    channel.bind('game-started', (data) => {
      updateGameState({
        gameMode: 'playing',
        currentPhoto: data.photo,
        gameId: data.gameId
      });
    });

    channel.bind('player-joined', (data) => {
      console.log('Player joined event received:', data);
      updateGameState(prev => ({
        players: [...prev.players, data.player]
      }));
    });

    channel.bind('next-photo', (data) => {
      updateGameState({
        currentPhoto: data.photo,
        selectedAnswer: null,
        votes: []
      });
    });

    channel.bind('game-ended', (data) => {
      updateGameState({
        gameMode: 'finished',
        scores: data.finalScores
      });
    });

    channel.bind('vote-update', (data) => {
      updateGameState({ votes: data.votes });
    });
  };

  // Helper function to update state
  const updateGameState = (updates) => {
    setGameState(prev => 
      typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
    );
  };

  // Game actions
  const actions = {
    // Navigation
    setView: (view) => updateGameState({ currentView: view }),
    setAdmin: (isAdmin) => updateGameState({ isAdmin }),

    // Admin authentication
    authenticateAdmin: (isAuthenticated) => {
      updateGameState({ 
        isAdmin: isAuthenticated,
        currentView: isAuthenticated ? 'admin' : 'home'
      });
    },

    // Photo management
    uploadPhoto: async (file, personName) => {
      try {
        const result = await apiService.uploadPhoto(file, personName);
        
        if (result.success) {
          updateGameState(prev => ({
            photos: [...prev.photos, result.photo],
            names: result.names
          }));
          console.log('Photo uploaded successfully!');
        }
        
        return result;
      } catch (error) {
        console.error('Upload failed:', error);
        return { success: false, error: error.message };
      }
    },

    updatePhoto: async (photoId, newName) => {
      try {
        const result = await apiService.updatePhoto(photoId, newName);
        
        if (result.success) {
          updateGameState(prev => ({
            photos: prev.photos.map(photo => 
              photo.id === photoId ? { ...photo, person: newName } : photo
            )
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    },

    deletePhoto: async (photoId) => {
      try {
        const result = await apiService.deletePhoto(photoId);
        
        if (result.success) {
          updateGameState(prev => ({
            photos: prev.photos.filter(photo => photo.id !== photoId)
          }));
        }
        
        return result;
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    },

    refreshPhotos: loadPhotos,

    // Game management
    joinGame: async (playerName) => {
      try {
        const result = await apiService.joinGame(playerName);
        
        updateGameState({
          hasJoined: true,
          playerName,
          gameId: result.gameId
        });

        return result;
      } catch (error) {
        console.error('Failed to join game:', error);
        throw error;
      }
    },

    startGame: async (settings) => {
      try {
        return await apiService.startGame(settings);
      } catch (error) {
        console.error('Failed to start game:', error);
        throw error;
      }
    },

    submitVote: async (answer) => {
      try {
        const result = await apiService.submitVote(
          gameState.gameId,
          gameState.playerName,
          answer
        );

        updateGameState({ selectedAnswer: answer });
        return result;
      } catch (error) {
        console.error('Failed to submit vote:', error);
        throw error;
      }
    },

    getHistory: async () => {
      try {
        const result = await apiService.getGameHistory();
        updateGameState({ gameHistory: result.history });
        return result;
      } catch (error) {
        console.error('Failed to get history:', error);
        return { history: [] };
      }
    },

    // State updates
    updateGameState
  };

  return (
    <GameContext.Provider value={{ gameState, actions }}>
      {children}
    </GameContext.Provider>
  );
};