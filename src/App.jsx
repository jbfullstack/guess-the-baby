import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Users, Trophy, Settings, Upload, Play, Timer, Check, X, Wifi, WifiOff } from 'lucide-react';

// Game Context with Pusher integration
const GameContext = createContext();

const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    currentView: 'home',
    gameMode: 'waiting', // waiting, playing, finished
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
  });

  const [pusher, setPusher] = useState(null);
  const [gameChannel, setGameChannel] = useState(null);

  // Initialize Pusher connection
  useEffect(() => {
    const initPusher = async () => {
      try {
        // Mock Pusher for now - we'll replace this with real Pusher later
        const mockPusher = {
          subscribe: (channelName) => ({
            bind: (event, callback) => {
              console.log(`Listening for ${event} on ${channelName}`);
              // Mock some events for demo
              if (event === 'player-joined') {
                setTimeout(() => callback({ player: { name: 'Demo Player' } }), 2000);
              }
            },
            unbind: () => console.log('Unbound'),
            trigger: (event, data) => console.log('Trigger:', event, data)
          }),
          disconnect: () => console.log('Pusher disconnected')
        };

        setPusher(mockPusher);
        setGameState(prev => ({ ...prev, isConnected: true }));

        // Subscribe to game channel
        const channel = mockPusher.subscribe('baby-game');
        setGameChannel(channel);

        // Bind to events
        channel.bind('game-started', (data) => {
          setGameState(prev => ({
            ...prev,
            gameMode: 'playing',
            currentPhoto: data.photo,
            gameId: data.gameId
          }));
        });

        channel.bind('player-joined', (data) => {
          setGameState(prev => ({
            ...prev,
            players: [...prev.players, data.player]
          }));
        });

      } catch (error) {
        console.error('Failed to initialize Pusher:', error);
        setGameState(prev => ({ ...prev, isConnected: false }));
      }
    };

    initPusher();

    return () => {
      if (pusher) {
        pusher.disconnect();
      }
    };
  }, []);

  // API calls to Vercel serverless functions
  const apiCall = async (endpoint, data = null, method = 'GET') => {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`/api/${endpoint}`, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API request failed');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };

  const actions = {
    // Upload photo to GitHub via Vercel function
    uploadPhoto: async (file, personName) => {
      try {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('personName', personName);

        const response = await fetch('/api/upload-photo', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        
        if (result.success) {
          // Update local state
          setGameState(prev => ({
            ...prev,
            names: result.names
          }));
          // Show success message
          console.log('Photo uploaded successfully!');
        }

        return result;
      } catch (error) {
        console.error('Upload failed:', error);
        return { success: false, error: error.message };
      }
    },

    // Join game
    joinGame: async (playerName) => {
      try {
        const result = await apiCall('join-game', { playerName }, 'POST');
        
        setGameState(prev => ({
          ...prev,
          hasJoined: true,
          playerName,
          gameId: result.gameId
        }));

        return result;
      } catch (error) {
        console.error('Failed to join game:', error);
        throw error;
      }
    },

    // Start game (admin only)
    startGame: async (settings) => {
      try {
        const result = await apiCall('start-game', { settings }, 'POST');
        return result;
      } catch (error) {
        console.error('Failed to start game:', error);
        throw error;
      }
    },

    // Submit vote
    submitVote: async (answer) => {
      try {
        const result = await apiCall('submit-vote', {
          gameId: gameState.gameId,
          playerName: gameState.playerName,
          answer
        }, 'POST');

        setGameState(prev => ({
          ...prev,
          selectedAnswer: answer
        }));

        return result;
      } catch (error) {
        console.error('Failed to submit vote:', error);
        throw error;
      }
    },

    // Get game history
    getHistory: async () => {
      try {
        const result = await apiCall('game-history');
        setGameState(prev => ({
          ...prev,
          gameHistory: result.history
        }));
        return result;
      } catch (error) {
        console.error('Failed to get history:', error);
        return { history: [] };
      }
    },

    // Update view
    setView: (view) => {
      setGameState(prev => ({ ...prev, currentView: view }));
    },

    // Set admin mode
    setAdmin: (isAdmin) => {
      setGameState(prev => ({ ...prev, isAdmin }));
    }
  };

  return (
    <GameContext.Provider value={{ gameState, actions }}>
      {children}
    </GameContext.Provider>
  );
};

const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

// UI Components
const Button = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled, ...props }) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
  
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg',
    success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', ...props }) => (
  <motion.div
    className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl ${className}`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    {...props}
  >
    {children}
  </motion.div>
);

const CountdownTimer = ({ seconds, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      onComplete?.();
    }
  }, [timeLeft, onComplete]);

  const progress = ((seconds - timeLeft) / seconds) * 100;

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-gray-300"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="text-purple-500"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress}, 100`}
          strokeLinecap="round"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{timeLeft}</span>
      </div>
    </div>
  );
};

// Connection Status Indicator
const ConnectionStatus = () => {
  const { gameState } = useGame();
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium ${
        gameState.isConnected 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}>
        {gameState.isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
};

// Page Components
const HomePage = () => {
  const { actions } = useGame();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Camera className="w-16 h-16 mx-auto mb-6 text-purple-400" />
        </motion.div>
        
        <h1 className="text-4xl font-bold text-white mb-4">Baby Photo Game</h1>
        <p className="text-gray-300 mb-8">Guess who's who in these adorable baby photos!</p>
        
        <div className="space-y-4">
          <Button size="lg" className="w-full" onClick={() => actions.setView('upload')}>
            <Upload className="w-5 h-5 mr-2" />
            Upload Photo
          </Button>
          
          <Button size="lg" className="w-full" onClick={() => actions.setView('game')}>
            <Play className="w-5 h-5 mr-2" />
            Join Game
          </Button>
          
          <Button variant="secondary" size="lg" className="w-full" onClick={() => {
            actions.setAdmin(true);
            actions.setView('admin');
          }}>
            <Settings className="w-5 h-5 mr-2" />
            Admin Panel
          </Button>
          
          <Button variant="secondary" size="lg" className="w-full" onClick={() => {
            actions.getHistory();
            actions.setView('history');
          }}>
            <Trophy className="w-5 h-5 mr-2" />
            Game History
          </Button>
        </div>
      </Card>
    </div>
  );
};

const UploadPage = () => {
  const { gameState, actions } = useGame();
  const [selectedName, setSelectedName] = useState('');
  const [newName, setNewName] = useState('');
  const [showNewNameInput, setShowNewNameInput] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleImageUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    const nameToUse = showNewNameInput ? newName : selectedName;
    if (file && nameToUse) {
      setUploading(true);
      try {
        const result = await actions.uploadPhoto(file, nameToUse);
        if (result.success) {
          actions.setView('home');
        } else {
          alert('Upload failed: ' + result.error);
        }
      } catch (error) {
        alert('Upload failed: ' + error.message);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Upload Your Baby Photo</h2>
        
        <div className="mb-6">
          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors">
              {uploadedImage ? (
                <img src={uploadedImage} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto" />
              ) : (
                <>
                  <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400">Click to upload photo</p>
                </>
              )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Who is in this photo?</h3>
          
          {!showNewNameInput ? (
            <div className="space-y-2">
              {gameState.names.map(name => (
                <label key={name} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="person"
                    value={name}
                    checked={selectedName === name}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="text-purple-600"
                  />
                  <span className="text-white">{name}</span>
                </label>
              ))}
              
              <button
                onClick={() => setShowNewNameInput(true)}
                className="text-purple-400 hover:text-purple-300 mt-2"
              >
                + Add new person
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
              />
              <button
                onClick={() => setShowNewNameInput(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => actions.setView('home')}>
            Back
          </Button>
          <Button 
            className="flex-1"
            onClick={handleSubmit}
            disabled={!file || (!selectedName && !newName) || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const GamePage = () => {
  const { gameState, actions } = useGame();
  const [playerName, setPlayerName] = useState('');

  const mockCurrentPhoto = {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop',
    correctAnswer: 'Alice'
  };

  const joinGame = async () => {
    if (playerName.trim()) {
      try {
        await actions.joinGame(playerName);
      } catch (error) {
        alert('Failed to join game: ' + error.message);
      }
    }
  };

  const submitAnswer = async () => {
    if (gameState.selectedAnswer) {
      try {
        await actions.submitVote(gameState.selectedAnswer);
      } catch (error) {
        alert('Failed to submit vote: ' + error.message);
      }
    }
  };

  if (!gameState.hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <Users className="w-16 h-16 mx-auto mb-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white mb-4">Join the Game</h2>
          
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-6"
          />
          
          <Button size="lg" className="w-full" onClick={joinGame}>
            Join Game
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full mt-3" 
            onClick={() => actions.setView('home')}
          >
            Back
          </Button>
        </Card>
      </div>
    );
  }

  if (gameState.gameMode === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Timer className="w-16 h-16 mx-auto mb-6 text-purple-400" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Waiting for Game to Start</h2>
          <p className="text-gray-300 mb-6">Players joined: {gameState.players.length}</p>
          
          <div className="space-y-2">
            {gameState.players.map((player, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 text-white">
                {player.name || player}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CountdownTimer seconds={gameState.gameSettings.timePerPhoto} onComplete={() => console.log('Time up!')} />
        
        <div className="my-6">
          <img 
            src={gameState.currentPhoto?.url || mockCurrentPhoto.url} 
            alt="Baby photo" 
            className="w-48 h-48 object-cover rounded-lg mx-auto border-4 border-purple-400"
          />
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-4">Who is this baby?</h3>
        
        <div className="space-y-2 mb-6">
          {gameState.names.map(name => (
            <button
              key={name}
              onClick={() => setGameState(prev => ({ ...prev, selectedAnswer: name }))}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                gameState.selectedAnswer === name
                  ? 'border-purple-400 bg-purple-400/20 text-white'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400/50'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        
        <Button 
          size="lg" 
          className="w-full"
          onClick={submitAnswer}
          disabled={!gameState.selectedAnswer}
        >
          Submit Answer
        </Button>
      </Card>
    </div>
  );
};

const AdminPage = () => {
  const { gameState, actions } = useGame();
  const [gameSettings, setGameSettings] = useState(gameState.gameSettings);

  const startGame = async () => {
    try {
      await actions.startGame(gameSettings);
    } catch (error) {
      alert('Failed to start game: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Panel</h1>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Game Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Time per photo (seconds)</label>
                  <input
                    type="number"
                    value={gameSettings.timePerPhoto}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, timePerPhoto: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                  />
                </div>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={gameSettings.autoNext}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, autoNext: e.target.checked }))}
                    className="text-purple-600"
                  />
                  <span className="text-gray-300">Auto advance to next photo</span>
                </label>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Players ({gameState.players.length})</h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameState.players.map((player, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <span className="text-white">{player.name || player}</span>
                    <span className="text-gray-400">Score: {gameState.scores[player.name] || 0}</span>
                  </div>
                ))}
                
                {gameState.players.length === 0 && (
                  <p className="text-gray-400 text-center py-8">No players joined yet</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <Button size="lg" onClick={startGame} disabled={gameState.players.length === 0}>
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
            
            <Button 
              variant="secondary" 
              onClick={() => {
                actions.setAdmin(false);
                actions.setView('home');
              }}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const HistoryPage = () => {
  const { gameState, actions } = useGame();

  useEffect(() => {
    actions.getHistory();
  }, []);

  const mockHistory = [
    { id: 1, date: '2024-01-15', players: [{ name: 'Alice' }, { name: 'Bob' }], winner: 'Alice', topScore: 15 },
    { id: 2, date: '2024-01-10', players: [{ name: 'Charlie' }, { name: 'Diana' }], winner: 'Bob', topScore: 12 },
  ];

  const historyToShow = gameState.gameHistory.length > 0 ? gameState.gameHistory : mockHistory;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <h1 className="text-3xl font-bold text-white mb-6">Game History</h1>
          
          <div className="space-y-4">
            {historyToShow.map(game => (
              <div key={game.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Game #{game.id}</h3>
                  <p className="text-gray-300">{new Date(game.date).toLocaleDateString()} • {game.players?.length || 0} players</p>
                </div>
                <div className="text-right">
                  <p className="text-purple-400 font-semibold">{game.winner}</p>
                  <p className="text-gray-300">{game.topScore || 0} points</p>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            variant="secondary" 
            className="mt-6"
            onClick={() => actions.setView('home')}
          >
            Back to Home
          </Button>
        </Card>
      </div>
    </div>
  );
};

// Main App Component
const BabyPhotoGame = () => {
  const { gameState } = useGame();

  const renderCurrentView = () => {
    switch (gameState.currentView) {
      case 'upload': return <UploadPage />;
      case 'game': return <GamePage />;
      case 'admin': return <AdminPage />;
      case 'history': return <HistoryPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      <ConnectionStatus />
      
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={gameState.currentView}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Root App
function App() {
  return (
    <GameProvider>
      <BabyPhotoGame />
    </GameProvider>
  );
}

export default App;