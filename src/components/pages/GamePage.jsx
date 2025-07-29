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
  const [hasTimerExpired, setHasTimerExpired] = useState(false);
  const [lastScoreGained, setLastScoreGained] = useState(0); // NOUVEAU

  // AUTO-SUBMIT when timer expires
  const handleTimerExpired = async () => {
    console.log('⏰ Timer expired!');
    
    // Prevent multiple timer submissions
    if (hasTimerExpired) {
      console.log('⏰ Timer already handled');
      return;
    }
    
    setHasTimerExpired(true);
    
    try {
      // If player hasn't voted yet, submit a placeholder vote
      if (!gameState.selectedAnswer) {
        console.log('⏰ Auto-submitting NO_ANSWER due to timer expiry');
        
        // Submit a special "no answer" vote to trigger round progression
        await actions.submitVote('NO_ANSWER');
        
        // Update local state to show they "answered"
        actions.updateGameState({ selectedAnswer: 'NO_ANSWER' });
      } else {
        console.log('⏰ Player already voted, timer expiry handled by server');
      }
    } catch (error) {
      console.error('⏰ Failed to handle timer expiry:', error);
    }
  };

  // Reset timer state when round changes
  useEffect(() => {
    setHasTimerExpired(false);
    setLastScoreGained(0); // NOUVEAU: Reset score display when round changes
  }, [gameState.currentRound]);

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
    if (gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER') {
      try {
        const result = await actions.submitVote(gameState.selectedAnswer);
        
        // NOUVEAU: Afficher le score gagné
        if (result.scoreGained) {
          setLastScoreGained(result.scoreGained);
          console.log(`🎯 Score gained: ${result.scoreGained} points!`);
        }
        
      } catch (error) {
        alert('Failed to submit vote: ' + error.message);
      }
    }
  };

  const handleLeaveGame = async () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      try {
        console.log('[LEAVE] Starting leave game process...');
        console.log('[LEAVE] Player name:', gameState.playerName);
        
        // Call the leave game API
        const result = await actions.leaveGame(gameState.playerName);
        
        console.log('[LEAVE] Leave game result:', result);
        
        // Navigate back to home
        actions.setView('home');
        
        // Show success message (optional)
        console.log('[LEAVE] Successfully left the game');
        
      } catch (error) {
        console.error('[LEAVE] Failed to leave game:', error);
        
        // Show detailed error but still allow local fallback
        const errorMessage = error.message || 'Unknown error occurred';
        const shouldContinue = window.confirm(
          `Failed to notify other players: ${errorMessage}\n\nYou can still leave locally. Continue?`
        );
        
        if (shouldContinue) {
          console.log('[LEAVE] Using local fallback...');
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

  // Active Game - WITH SCORE FEEDBACK
  if (gameState.gameMode === 'playing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          {/* Timer - UPDATED */}
          <div className="mb-4">
            <CountdownTimer 
              key={`timer-${gameState.currentRound}-${gameState.currentPhoto?.id}`} // Force restart on round change
              seconds={gameState.gameSettings.timePerPhoto} 
              onComplete={handleTimerExpired}
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
          
          {/* Answer Options - UPDATED */}
          <div className="space-y-3 mb-6">
            {gameState.names.map(name => (
              <button
                key={name}
                onClick={() => actions.updateGameState({ selectedAnswer: name })}
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
          
          {/* Submit Button - UPDATED */}
          <Button 
            size="lg" 
            className="w-full"
            onClick={submitAnswer}
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
          
          {/* Status Messages - UPDATED WITH SCORE DISPLAY */}
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
              
              {/* NOUVEAU: Affichage du score gagné */}
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
  }

  // Fallback for unknown game state
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <Timer className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading Game...</h2>
          <p className="text-gray-300">Please wait while we set up your game.</p>
        </div>
        
        <Button 
          variant="secondary" 
          onClick={() => actions.setView('home')}
          className="w-full"
        >
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default GamePage;