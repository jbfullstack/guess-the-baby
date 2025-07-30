import React from 'react';
import { Crown, Trophy, Play, X } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const GameFinished = ({ gameState, gameResult, onViewHistory, onLeaveGame }) => {
  const finalScores = gameResult?.finalScores || gameState.scores || {};
  
  // 🔧 FIX 1: Filter out phantom participants (clean real players only)
  const realPlayers = Object.entries(finalScores)
    .filter(([playerName, score]) => {
      // Must be a valid player name (not just numbers like "0", "1", "2")
      const isValidName = playerName && 
                         typeof playerName === 'string' && 
                         playerName.trim() !== '' &&
                         playerName.trim().length >= 2 && // At least 2 chars
                         !/^\d+$/.test(playerName.trim()); // Not just numbers
      
      // Must be a valid score (number >= 0)
      const isValidScore = typeof score === 'number' && !isNaN(score) && score >= 0;
      
      return isValidName && isValidScore;
    })
    .sort(([,a], [,b]) => b - a);
  
  // 🔧 FIX 2: Calculate real winner from sorted real players
  const winner = (gameResult?.winner && gameResult.winner !== 'Unknown' && gameResult.winner.trim().length >= 2) 
    ? gameResult.winner 
    : (realPlayers.length > 0 ? realPlayers[0][0] : 'No Winner');

  console.log('[GAME FINISHED] 🏆 Cleaned data:', {
    originalScores: finalScores,
    realPlayers: realPlayers.length,
    calculatedWinner: winner
  });

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
          
          {/* Show only real players */}
          {realPlayers.length > 0 ? (
            <div className={`space-y-2 ${realPlayers.length > 5 ? 'max-h-48 overflow-y-auto' : ''}`}>
              {realPlayers.map(([playerName, score], index) => (
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
          ) : (
            <p className="text-gray-400">No valid scores available</p>
          )}
          
          {/* Show participant count */}
          {realPlayers.length > 0 && (
            <div className="mt-3 pt-2 border-t border-white/10">
              <p className="text-xs text-gray-400">
                Total Participants: {realPlayers.length}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex space-x-3">
            <Button 
              variant="secondary"
              onClick={onViewHistory}
              className="flex-1"
            >
              <Trophy className="w-4 h-4 mr-2" />
              View History
            </Button>
            <Button 
              onClick={onLeaveGame}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Leave Game
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GameFinished;