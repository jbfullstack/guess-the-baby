import React from 'react';
import { ArrowRight } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';
import CountdownTimer from '../../ui/CountdownTimer';

const ActiveGame = ({ 
  gameState, 
  hasTimerExpired, 
  lastScoreGained, 
  onTimerExpired, 
  onSelectAnswer, 
  onSubmitAnswer 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        {/* Timer */}
        <div className="mb-4">
          <CountdownTimer 
            key={`timer-${gameState.currentRound}-${gameState.currentPhoto?.id}`}
            seconds={gameState.gameSettings.timePerPhoto} 
            onComplete={onTimerExpired}
          />
        </div>
        
        {/* Photo */}
        <div className="mb-6">
          <div className="relative">
            <img 
              src={gameState.currentPhoto?.url} 
              alt="Baby photo" 
              className="w-64 h-64 object-cover rounded-xl mx-auto border-4 border-purple-400 shadow-lg"
            />
            
            {/* Answer Status */}
            {gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER' && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                Answered!
              </div>
            )}
            
            {/* Timer Expired Status */}
            {gameState.selectedAnswer === 'NO_ANSWER' && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                Time Up!
              </div>
            )}
            
            {/* Votes Progress */}
            {gameState.votes && Object.keys(gameState.votes).length > 0 && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                {Object.keys(gameState.votes).length}/{gameState.players.length} voted
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
              onClick={() => onSelectAnswer(name)}
              disabled={gameState.selectedAnswer || hasTimerExpired}
              className={`w-full p-3 rounded-lg border-2 transition-all font-medium ${
                gameState.selectedAnswer === name
                  ? 'border-purple-400 bg-purple-400/20 text-white shadow-lg'
                  : gameState.selectedAnswer || hasTimerExpired
                  ? 'border-gray-500 bg-gray-500/10 text-gray-400 cursor-not-allowed'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400/50 hover:bg-purple-400/10'
              }`}
            >
              {name}
              {gameState.selectedAnswer === name && gameState.selectedAnswer !== 'NO_ANSWER' && (
                <ArrowRight className="inline w-4 h-4 ml-2" />
              )}
            </button>
          ))}
        </div>
        
        {/* Submit Button */}
        <Button 
          size="lg" 
          className="w-full"
          onClick={onSubmitAnswer}
          disabled={!gameState.selectedAnswer || gameState.selectedAnswer === 'NO_ANSWER'}
        >
          {hasTimerExpired 
            ? 'Time Expired' 
            : gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER'
            ? 'Submit Answer' 
            : 'Select an Answer'
          }
        </Button>

        {/* Game Info */}
        <div className="mt-4 text-xs text-gray-400">
          Round {gameState.currentRound || 1} of {gameState.totalPhotos || '?'} • {gameState.players.length} players
        </div>
        
        {/* Status Messages */}
        {gameState.selectedAnswer === 'NO_ANSWER' && (
          <div className="mt-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              ⏰ Time expired! Waiting for other players...
            </p>
          </div>
        )}
        
        {gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER' && (
          <div className="mt-4 bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              ✅ Vote submitted! Waiting for other players...
            </p>
            
            {/* Score Display */}
            {lastScoreGained > 0 && (
              <div className="mt-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2">
                <p className="text-green-400 text-sm font-bold text-center">
                  🎯 +{lastScoreGained} points earned!
                </p>
                <p className="text-green-300 text-xs mt-1">
                  {lastScoreGained >= 150 ? '🚀 Lightning fast!' : 
                   lastScoreGained >= 125 ? '⚡ Good speed!' : 
                   '✅ Correct answer!'}
                </p>
              </div>
            )}
            
            <div className="text-xs text-blue-300 mt-1">
              {gameState.votes ? Object.keys(gameState.votes).length : 0} / {gameState.players.length} players have voted
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActiveGame;