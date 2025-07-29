import React, { useState, useEffect } from 'react';
import { Users, Timer, Crown, ArrowRight, X, Play, Trophy } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';
import CountdownTimer from '../ui/CountdownTimer';

const GamePage = () => {
  const { gameState, actions } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [gameResult, setGameResult] = useState(null);

  // Mock current photo for demo
  const mockCurrentPhoto = {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    correctAnswer: 'Alice'
  };

  const joinGame = async () => {
    if (playerName.trim()) {
      try {
        await actions.joinGame(playerName.trim());
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

  const handleLeaveGame = async () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
        try {
        // Show loading state
        console.log('Leaving game...');
        
        await actions.leaveGame(gameState.playerName);
        
        // Navigate back to home
        actions.setView('home');
        
        } catch (error) {
        console.error('Failed to leave game:', error);
        
        // Show error but still allow local fallback
        const shouldContinue = window.confirm(
            'Failed to notify other players, but you can still leave locally. Continue?'
        );
        
        if (shouldContinue) {
            // Fallback to local state update
            actions.updateGameState({ 
            hasJoined: false,
            playerName: '',
            selectedAnswer: null 
            });
            actions.setView('home');
        }
        }
    }
    };


  // Join Game Screen
  if (!gameState.hasJoined) {
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
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              maxLength={20}
            />
            
            <Button 
              size="lg" 
              className="w-full" 
              onClick={joinGame}
              disabled={!playerName.trim()}
            >
              Join Game
            </Button>
            
            <Button 
              variant="secondary" 
              className="w-full" 
              onClick={() => actions.setView('home')}
            >
              Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Waiting Room
  if (gameState.gameMode === 'waiting') {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <Timer className="w-16 h-16 mx-auto mb-4 text-purple-400 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">Waiting for Game to Start</h2>
          <p className="text-gray-300">The admin will start the game soon...</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Players Joined ({gameState.players.length})</span>
          </h3>
          
          {gameState.players.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {gameState.players.map((player, index) => (
                <div 
                  key={player.name || index} 
                  className="flex items-center justify-between bg-white/5 rounded-lg p-2"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                      {(player.name || player).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">
                      {player.name || player}
                      {(player.name || player) === gameState.playerName && (
                        <span className="text-purple-400 ml-2 text-sm">(You)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Ready</span>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No players yet...</p>
          )}
        </div>

        {/* Leave Game Button with confirmation */}
        <div className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              💡 You can leave at any time. Other players and the admin will be notified.
            </p>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={handleLeaveGame}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Leave Game
          </Button>
        </div>
      </Card>
    </div>
  );
}

  // Game Finished
  if (gameState.gameMode === 'finished' || gameResult) {
    const winner = gameResult?.winner || 'Unknown';
    const finalScores = gameResult?.finalScores || gameState.scores || {};
    const sortedPlayers = Object.entries(finalScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Game Over!</h2>
            
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 mb-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold text-yellow-400 mb-1">🏆 Winner</h3>
            <p className="text-2xl font-bold text-white">{winner}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Final Scores</h3>
            <div className="space-y-2">
                {sortedPlayers.map(([playerName, score], index) => (
                <div 
                    key={playerName}
                    className={`flex items-center justify-between p-2 rounded ${
                    index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'
                    }`}
                >
                    <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                        {playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className={`font-medium ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                        {playerName}
                        {playerName === gameState.playerName && (
                        <span className="text-purple-400 ml-1 text-sm">(You)</span>
                        )}
                    </span>
                    </div>
                    <span className={`font-bold ${
                    index === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {score} pts
                    </span>
                </div>
                ))}
            </div>
            </div>

            {/* Action buttons with proper Leave Game */}
            <div className="space-y-3">
            <div className="flex space-x-3">
                <Button 
                variant="secondary"
                onClick={() => actions.setView('history')}
                className="flex-1"
                >
                <Trophy className="w-4 h-4 mr-2" />
                View History
                </Button>
                <Button 
                onClick={handleLeaveGame}
                className="flex-1"
                >
                <Play className="w-4 h-4 mr-2" />
                Play Again
                </Button>
            </div>
            
            {/* Additional leave option */}
            <Button 
                variant="outline" 
                onClick={handleLeaveGame}
                className="w-full"
            >
                <X className="w-4 h-4 mr-2" />
                Leave Game
            </Button>
            </div>
        </Card>
        </div>
    );
    }

  // Active Game
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        {/* Timer */}
        <div className="mb-4">
          <CountdownTimer 
            seconds={gameState.gameSettings.timePerPhoto} 
            onComplete={() => console.log('Time up!')} 
          />
        </div>
        
        {/* Photo */}
        <div className="mb-6">
          <div className="relative">
            <img 
              src={gameState.currentPhoto?.url || mockCurrentPhoto.url} 
              alt="Baby photo" 
              className="w-64 h-64 object-cover rounded-xl mx-auto border-4 border-purple-400 shadow-lg"
            />
            {gameState.selectedAnswer && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                Answered!
              </div>
            )}
          </div>
        </div>
        
        {/* Question */}
        <h3 className="text-xl font-semibold text-white mb-6">
          Who is this adorable baby? 👶
        </h3>
        
        {/* Answer Options */}
        <div className="space-y-3 mb-6">
          {gameState.names.map(name => (
            <button
              key={name}
              onClick={() => actions.updateGameState({ selectedAnswer: name })}
              disabled={gameState.selectedAnswer}
              className={`w-full p-3 rounded-lg border-2 transition-all font-medium ${
                gameState.selectedAnswer === name
                  ? 'border-purple-400 bg-purple-400/20 text-white shadow-lg'
                  : gameState.selectedAnswer
                  ? 'border-gray-500 bg-gray-500/10 text-gray-400 cursor-not-allowed'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400/50 hover:bg-purple-400/10'
              }`}
            >
              {name}
              {gameState.selectedAnswer === name && (
                <ArrowRight className="inline w-4 h-4 ml-2" />
              )}
            </button>
          ))}
        </div>
        
        {/* Submit Button */}
        <Button 
          size="lg" 
          className="w-full"
          onClick={submitAnswer}
          disabled={!gameState.selectedAnswer}
        >
          {gameState.selectedAnswer ? 'Submit Answer' : 'Select an Answer'}
        </Button>

        {/* Game Info */}
        <div className="mt-4 text-xs text-gray-400">
          Round {gameState.currentRound || 1} • {gameState.players.length} players
        </div>
      </Card>
    </div>
  );
};

export default GamePage;