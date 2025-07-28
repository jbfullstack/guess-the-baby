import React, { createContext, useState, useEffect, useReducer } from 'react';
import Pusher from 'pusher-js';
import apiService from '../services/api';

export const GameContext = createContext();

const gameStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };
    
    case 'JOIN_GAME':
      return { 
        ...state, 
        hasJoined: true,
        players: [...state.players, action.payload]
      };
    
    case 'UPDATE_GAME_STATE':
      return { ...state, ...action.payload };
    
    case 'SET_CURRENT_PHOTO':
      return { ...state, currentPhoto: action.payload };
    
    case 'UPDATE_SCORES':
      return { ...state, scores: action.payload };
    
    case 'SET_ADMIN':
      return { ...state, isAdmin: action.payload };
    
    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.payload]
      };
    
    case 'RESET_GAME':
      return {
        ...state,
        gameMode: 'waiting',
        currentPhoto: null,
        selectedAnswer: null,
        hasVoted: false,
        scores: {}
      };
    
    default:
      return state;
  }
};

const initialGameState = {
  currentView: 'home',
  gameMode: 'waiting',
  playerName: '',
  hasJoined: false,
  isAdmin: false,
  currentPhoto: null,
  selectedAnswer: null,
  hasVoted: false,
  players: [],
  photos: [],
  names: ['Alice', 'Bob', 'Charlie', 'Diana'],
  scores: {},
  gameSettings: {
    timePerPhoto: 10,
    autoNext: true
  },
  gameHistory: [],
  isConnected: false,
  gameId: null,
  votes: []
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameStateReducer, initialGameState);
  const [pusher, setPusher] = useState(null);
  const [gameChannel, setGameChannel] = useState(null);

  // Initialize REAL Pusher connection and load photos
  useEffect(() => {
    initializePusher();
    loadPhotos();
    
    return () => {
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  const initializePusher = async () => {
    try {
      console.log('🚀 Initializing REAL Pusher...');
      
      // REAL Pusher (not mock!)
      const realPusher = new Pusher('c9eb0b76bcbe61c6a397', {
        cluster: 'eu',
        encrypted: true
      });

      setPusher(realPusher);
      updateGameState({ isConnected: true });

      // Subscribe to game channel
      const channel = realPusher.subscribe('baby-game');
      setGameChannel(channel);
      
      console.log('📡 Channel subscribed:', channel);
      
      bindPusherEvents(channel);
    } catch (error) {
      console.error('❌ Failed to initialize Pusher:', error);
      updateGameState({ isConnected: false });
    }
  };

  const bindPusherEvents = (channel) => {
    console.log('🎯 Binding Pusher events...');

    channel.bind('player-joined', (data) => {
      console.log('🎉 Player joined event received:', data);
      dispatch({
        type: 'ADD_PLAYER',
        payload: data.player
      });
    });

    channel.bind('game-started', (data) => {
      console.log('🎮 Game started:', data);
      updateGameState({
        gameMode: 'playing',
        currentPhoto: data.photo,
        gameId: data.gameId
      });
    });

    channel.bind('next-photo', (data) => {
      console.log('📸 Next photo:', data);
      updateGameState({
        currentPhoto: data.photo,
        selectedAnswer: null,
        votes: []
      });
    });

    channel.bind('game-ended', (data) => {
      console.log('🏁 Game ended:', data);
      updateGameState({
        gameMode: 'finished',
        scores: data.finalScores
      });
    });

    channel.bind('vote-update', (data) => {
      console.log('🗳️ Vote update:', data);
      updateGameState({ votes: data.votes });
    });

    channel.bind('round-ended', (data) => {
      console.log('🔄 Round ended:', data);
      updateGameState({ 
        scores: data.scores
      });
    });
  };

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

  // Helper function to update state
  const updateGameState = (updates) => {
    dispatch({
      type: 'UPDATE_GAME_STATE',
      payload: typeof updates === 'function' ? updates(state) : updates
    });
  };

  // Game actions
  const actions = {
    // Navigation
    setView: (view) => dispatch({ type: 'SET_VIEW', payload: view }),
    setAdmin: (isAdmin) => dispatch({ type: 'SET_ADMIN', payload: isAdmin }),

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
          state.gameId,
          state.playerName,
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
    <GameContext.Provider value={{ gameState: state, actions }}>
      {children}
    </GameContext.Provider>
  );
};