import React from 'react';
import { Users } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const JoinGameScreen = ({ playerName, setPlayerName, onJoinGame, onBack }) => {
  const handleJoinGame = async () => {
    if (playerName.trim()) {
      try {
        await onJoinGame(playerName.trim());
      } catch (error) {
        alert('Failed to join game: ' + error.message);
      }
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
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
            maxLength={20}
          />
          
          <Button 
            size="lg" 
            className="w-full" 
            onClick={handleJoinGame}
            disabled={!playerName.trim()}
          >
            Join Game
          </Button>
          
          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={onBack}
          >
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default JoinGameScreen;