import React from 'react';
import { ArrowRight, Zap, Trophy, Target } from 'lucide-react';
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
  // Fonction pour déterminer le type de performance style Kahoot
  const getPerformanceType = (score) => {
    if (score >= 175) return { type: 'lightning', icon: '⚡', text: 'Lightning Fast!', color: 'text-yellow-300' };
    if (score >= 150) return { type: 'fast', icon: '🚀', text: 'Super Fast!', color: 'text-orange-300' };
    if (score >= 125) return { type: 'good', icon: '✅', text: 'Good Speed!', color: 'text-green-300' };
    if (score >= 100) return { type: 'correct', icon: '🎯', text: 'Correct!', color: 'text-blue-300' };
    return { type: 'none', icon: '', text: '', color: '' };
  };

  const performance = getPerformanceType(lastScoreGained);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        {/* Timer */}
        <div className="mb-4">
          <CountdownTimer 
            key={`timer-${gameState.currentRound}-${gameState.currentPhoto?.id}`}
            seconds={gameState.gameSettings?.timePerPhoto || 10} 
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
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                <Target className="w-3 h-3" />
                <span>Answered!</span>
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
              className={`w-full p-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                gameState.selectedAnswer === name
                  ? 'border-purple-400 bg-purple-400/20 text-white shadow-lg transform scale-105'
                  : gameState.selectedAnswer || hasTimerExpired
                  ? 'border-gray-500 bg-gray-500/10 text-gray-400 cursor-not-allowed'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400/50 hover:bg-purple-400/10 hover:transform hover:scale-102'
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
            
            {/* 🎯 KAHOOT SCORE DISPLAY - ENHANCED */}
            {lastScoreGained > 0 && (
              <div className="mt-3 space-y-2">
                {/* Main Score Display */}
                <div className="bg-gradient-to-r from-green-500/30 to-blue-500/30 border border-green-400/50 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <p className="text-white text-lg font-bold">
                      +{lastScoreGained} Points!
                    </p>
                  </div>
                  
                  {/* Performance Badge Style Kahoot */}
                  <div className={`flex items-center justify-center space-x-2 ${performance.color}`}>
                    <span className="text-lg">{performance.icon}</span>
                    <p className="font-semibold text-sm">
                      {performance.text}
                    </p>
                  </div>
                </div>

                {/* Detailed Breakdown (si score élevé) */}
                {lastScoreGained >= 150 && (
                  <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-2">
                    <div className="flex items-center justify-center space-x-3 text-xs">
                      <div className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-300">Speed Bonus</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="w-3 h-3 text-green-400" />
                        <span className="text-green-300">Accuracy</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivation Message Style Kahoot */}
                <div className="text-center">
                  <p className="text-xs text-gray-300 italic">
                    {lastScoreGained >= 175 ? "🔥 You're on fire!" :
                     lastScoreGained >= 150 ? "🚀 Great timing!" :
                     lastScoreGained >= 125 ? "👍 Nice job!" :
                     "✨ Well done!"}
                  </p>
                </div>
              </div>
            )}
            
            {/* Vote Progress */}
            <div className="text-xs text-blue-300 mt-3 border-t border-blue-500/30 pt-2">
              <div className="flex items-center justify-between">
                <span>Voting Progress:</span>
                <span className="font-semibold">
                  {gameState.votes ? Object.keys(gameState.votes).length : 0} / {gameState.players.length}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-1 w-full bg-blue-900/30 rounded-full h-1.5">
                <div 
                  className="bg-blue-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${gameState.votes ? (Object.keys(gameState.votes).length / gameState.players.length) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* 🎮 Current Score Display (Mini) */}
        {gameState.scores && gameState.scores[gameState.playerName] !== undefined && (
          <div className="mt-3 bg-purple-500/10 border border-purple-400/30 rounded-lg p-2">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm font-semibold">
                Your Score: {gameState.scores[gameState.playerName]} pts
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActiveGame;