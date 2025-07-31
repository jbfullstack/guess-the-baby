import React, { useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const JoinGameScreen = ({ playerName, setPlayerName, onJoinGame, onBack, gameState }) => {
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGame = async (isRejoin = false) => {
    if (!playerName.trim() || isJoining) return;
    
    setJoinError('');
    setIsJoining(true);
    
    try {
      await onJoinGame(playerName.trim(), isRejoin);
      // Success - will navigate away
    } catch (error) {
      console.error('Join game error:', error);
      setJoinError('Failed to join game: ' + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <Users className="w-16 h-16 mx-auto mb-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-white mb-4">Join the Game</h2>
        <p className="text-gray-300 mb-6">Enter your name to join the baby photo guessing game!</p>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setJoinError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && !isJoining && handleJoinGame(false)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
            maxLength={20}
            disabled={isJoining}
          />
          
          {/* Error message */}
          {joinError && (
            <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
              {joinError}
            </div>
          )}
          
          {/* Main Join Game button */}
          <Button 
            size="lg" 
            className="w-full" 
            onClick={() => handleJoinGame(false)}
            disabled={!playerName.trim() || isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </Button>
          
          {/* "or" separator */}
          <div className="text-center">
            <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">or</span>
          </div>
          
          {/* Rejoin Game button */}
          <Button 
            size="lg" 
            variant="secondary"
            className="w-full" 
            onClick={() => handleJoinGame(true)}
            disabled={!playerName.trim() || isJoining}
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Rejoin Game
          </Button>
          
          {/* Back button */}
          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={onBack}
            disabled={isJoining}
          >
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default JoinGameScreen;