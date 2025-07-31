import React, { createContext, useState, useEffect, useReducer } from 'react';
import Pusher from 'pusher-js';
import apiService from '../services/api';
import { PUSHER_ID } from '../constants';

import { DEFAULT_TIME_PER_ROUND } from '../constants';

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
      // Avoid duplicates
      const existingPlayer = state.players.find(p => p.name === action.payload.name);
      if (existingPlayer) return state;
      
      return {
        ...state,
        players: [...state.players, action.payload]
      };
    
    case 'SET_ALL_PLAYERS':
      return {
        ...state,
        players: action.payload
      };
    
    case 'RESET_GAME':
      return {
        ...state,
        gameMode: 'waiting',
        currentPhoto: null,
        selectedAnswer: null,
        hasVoted: false,
        votes: [],
        currentRound: 0,
        players: [],
        scores: {},
        gameId: null,
        hasJoined: false
      };

    case 'RESTORE_STATE':
      // Full state restoration from server
      return {
        ...state,
        ...action.payload,
        isConnected: state.isConnected // Preserve connection status
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
    timePerPhoto: DEFAULT_TIME_PER_ROUND
  },
  gameHistory: [],
  isConnected: false,
  gameId: null,
  votes: [],
  currentRound: 0,
  isRecovering: false
};

export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameStateReducer, initialGameState);
  const [pusher, setPusher] = useState(null);
  const [gameChannel, setGameChannel] = useState(null);

  // Initialize connection and recover state
  useEffect(() => {
    initializeApp();
    
    return () => {
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      updateGameState({ isRecovering: true });
      
      // 1. Initialize Pusher first
      await initializePusher();
      
      // 2. Recover state from server
      await recoverGameState();
      
      updateGameState({ isRecovering: false });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      updateGameState({ isRecovering: false, isConnected: false });
    }
  };

  const initializePusher = async () => {
    try {
      console.log('🚀 Initializing Pusher...');
      
      const realPusher = new Pusher(PUSHER_ID, {
        cluster: 'eu',
        encrypted: true
      });

      setPusher(realPusher);
      updateGameState({ isConnected: true });

      // Subscribe to game channel
      const channel = realPusher.subscribe('baby-game');
      setGameChannel(channel);
      
      bindPusherEvents(channel);
      
      console.log('✅ Pusher connected and events bound');
    } catch (error) {
      console.error('❌ Failed to initialize Pusher:', error);
      updateGameState({ isConnected: false });
    }
  };

  const recoverGameState = async () => {
    try {
      console.log('🔄 Recovering game state...');
      
      const result = await apiService.getGameState();
      
      if (result.success) {
        // Restore complete state
        dispatch({
          type: 'RESTORE_STATE',
          payload: {
            ...result.gameState,
            photos: result.photos,
            names: result.names,
            gameHistory: result.gameHistory
          }
        });
        
        console.log('✅ State recovered:', result.gameState);
      }
    } catch (error) {
      console.error('❌ Failed to recover state:', error);
      // Continue with default state
    }
  };

   const bindPusherEvents = (channel) => {
    console.log('🎯 Binding Pusher events...');

    channel.bind('player-joined', (data) => {
        console.log('🎉 Player joined:', data);
        
        // Update all players if provided, otherwise add single player
        if (data.allPlayers) {
        dispatch({
            type: 'SET_ALL_PLAYERS',
            payload: data.allPlayers
        });
        } else {
        dispatch({
            type: 'ADD_PLAYER',
            payload: data.player
        });
        }

        // NOUVEAU : Update names if provided
        if (data.names && Array.isArray(data.names)) {
        console.log('🏷️ Updating names from player-joined:', data.names);
        updateGameState({ names: data.names });
        }
    });

    channel.bind('game-started', (data) => {
        console.log('🎮 Game started:', data);
        updateGameState({
        gameMode: 'playing',
        currentPhoto: data.photo,
        gameId: data.gameId,
        currentRound: data.currentRound || 1,
        selectedAnswer: null,
        votes: [],
        settings: data.settings || { timePerPhoto: DEFAULT_TIME_PER_ROUND },
        totalPhotos: data.totalPhotos
        });
    });

    // Dans bindPusherEvents function - CLIENT-SIDE DELAY MANAGEMENT

    channel.bind('round-ended', (data) => {
        console.log('🔄 Round ended:', data);
        updateGameState({ 
            scores: data.scores
        });
        
        // Client-side delay before processing next action
        const delay = data.nextRoundDelay || 3000;
        console.log(`🔄 ⏱️ Waiting ${delay}ms before next action...`);
    });

    channel.bind('next-photo', (data) => {
        console.log('📸 Next photo received:', data);
        
        // Function to apply the next photo update
        const applyNextPhoto = () => {
            console.log('📸 ✅ Applying next photo update...');
            updateGameState({
            currentPhoto: data.photo,
            currentRound: data.round,
            selectedAnswer: null,        // RESET voting state
            hasVoted: false,            // RESET voting state  
            votes: {},                  // CLEAR votes for new round
            scores: data.scores,        // UPDATE scores
            gameMode: data.gameMode || 'playing',
            settings: data.settings || state.settings,
            totalPhotos: data.totalRounds || state.totalPhotos
          });
          console.log(`📸 ✅ Updated to round ${data.round}, photo: ${data.photo.id}`);
        };
        
        // Apply delay if specified, otherwise immediate
        const delay = data.showDelay || 0;
        if (delay > 0) {
            console.log(`📸 ⏱️ Waiting ${delay}ms before showing next photo...`);
            setTimeout(applyNextPhoto, delay);
        } else {
            applyNextPhoto();
        }
    });

    channel.bind('game-ended', (data) => {
        console.log('🏁 Game ended:', data);
        
        // Function to apply game end
        const applyGameEnd = () => {
            console.log('🏁 ✅ Applying game end...');
            updateGameState({
            gameMode: 'finished',
            scores: data.finalScores
            });
        };
        
        // Apply delay if specified, otherwise immediate
        const delay = data.showDelay || 0;
        if (delay > 0) {
            console.log(`🏁 ⏱️ Waiting ${delay}ms before showing game end...`);
            setTimeout(applyGameEnd, delay);
        } else {
            applyGameEnd();
        }
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
        
        // Client-side delay before processing next action
        const delay = data.nextRoundDelay || 3000;
        console.log(`🔄 ⏱️ Waiting ${delay}ms before next action...`);
    });

    channel.bind('round-error', (data) => {
        console.error('🚨 Round error received:', data);
        alert(`Game error: ${data.error}\nRound: ${data.round}\nPlease refresh or contact admin.`);
    });
    channel.bind('sync-state', (data) => {
        console.log('🔄 Syncing state:', data);
        // Only apply if this is for us (or if no target specified)
        if (!data.targetPlayer || data.targetPlayer === state.playerName) {
        // NOUVEAU : Include names in sync
        const syncData = { ...data.gameState };
        if (data.gameState.names) {
            console.log('🏷️ Updating names from sync-state:', data.gameState.names);
        }
        updateGameState(syncData);
        }
    });

    channel.bind('game-reset', (data) => {
        console.log('🔄 Game reset:', data);
        dispatch({ type: 'RESET_GAME' });
        // Optionally show a message to user
        if (data.message) {
        console.log('Game reset:', data.message);
        }
    });

    channel.bind('player-left', (data) => {
        console.log('🚪 Player left:', data);
        updateGameState({
        players: data.remainingPlayers,
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
        
        // NOUVEAU : Update names from join response
        const updateData = {
            hasJoined: true,
            playerName,
            gameId: result.gameId,
            gameMode: result.gameMode,
            players: result.players || state.players,
            scores: result.scores || state.scores
        };

        // Include real names if provided
        if (result.names && Array.isArray(result.names)) {
            console.log('🏷️ Updating names from join response:', result.names);
            updateData.names = result.names;
        }

        updateGameState(updateData);

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

    // Recovery
    recoverState: recoverGameState,

    // Game reset
    resetGame: async (resetType = 'hard') => {
      try {
        const response = await fetch('/api/reset-game-state-redis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resetType }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Reset failed');
        }
        
        return result;
      } catch (error) {
        console.error('Failed to reset game:', error);
        throw error;
      }
    },

    // Leave game (for players)
    leaveGame: async (playerName) => {
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

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Leave game failed');
        }
        
        // Update local state
        updateGameState({ 
          hasJoined: false,
          playerName: '',
          selectedAnswer: null
        });
        
        return result;
      } catch (error) {
        console.error('Failed to leave game:', error);
        throw error;
      }
    },

    // Remove player (for admin)
    removePlayer: async (playerName) => {
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

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Remove player failed');
        }
        
        return result;
      } catch (error) {
        console.error('Failed to remove player:', error);
        throw error;
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