import React, { useState, useEffect } from 'react';
import { useGame } from '../../../hooks/useGame';

// Import des sous-composants
import JoinGameScreen from './JoinGameScreen';
import WaitingRoom from './WaitingRoom';
import GameFinished from './GameFinished';
import ActiveGame from './ActiveGame';
import LoadingScreen from './LoadingScreen';

const GamePage = () => {
  const { gameState, actions } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [gameResult, setGameResult] = useState(null);
  const [hasTimerExpired, setHasTimerExpired] = useState(false);
  const [lastScoreGained, setLastScoreGained] = useState(0);

  // 🎮 LISTEN FOR GAME END EVENT - CRITICAL FIX
  useEffect(() => {
    if (typeof window !== 'undefined' && window.pusher) {
      const channel = window.pusher.subscribe('baby-game');
      
      // Listen for game end
      channel.bind('game-ended', (data) => {
        console.log('[GAME PAGE] 🏁 Game ended event received:', data);
        
        // Set game result for GameFinished component
        setGameResult({
          winner: data.winner,
          finalScores: data.finalScores,
          totalRounds: data.totalRounds,
          gameMode: 'finished'
        });
        
        // Update local game state
        actions.updateGameState({
          gameMode: 'finished',
          winner: data.winner,
          scores: data.finalScores
        });
        
        console.log('[GAME PAGE] ✅ Game state updated to finished');
      });

      // Listen for round ended (to show score feedback)
      channel.bind('round-ended', (data) => {
        console.log('[GAME PAGE] 🎯 Round ended:', data);
        // Keep current score display until next round
      });

      // Listen for next photo (reset score display)
      channel.bind('next-photo', (data) => {
        console.log('[GAME PAGE] ➡️ Next photo:', data);
        // Reset score display for new round
        setLastScoreGained(0);
        
        // Update game state with new photo
        actions.updateGameState({
          currentPhoto: data.photo,
          currentRound: data.round,
          selectedAnswer: null, // Reset selection
          votes: {} // Reset votes
        });
      });

      return () => {
        channel.unbind('game-ended');
        channel.unbind('round-ended'); 
        channel.unbind('next-photo');
      };
    }
  }, [actions]);

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
    // Note: Don't reset lastScoreGained here, let it persist until next round starts
  }, [gameState.currentRound]);

  // Join game handler
  const handleJoinGame = async (playerName, isRejoin = false) => {
    await actions.joinGame(playerName, isRejoin);
  };

  // 🎯 IMPROVED Submit answer handler with Kahoot score feedback
  const handleSubmitAnswer = async () => {
    if (gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER') {
      try {
        console.log('[GAME PAGE] 🎮 Submitting answer:', gameState.selectedAnswer);
        
        const result = await actions.submitVote(gameState.selectedAnswer);
        
        console.log('[GAME PAGE] 📊 Vote result:', result);
        
        // 🎯 KAHOOT SCORE FEEDBACK - Enhanced
        if (result.scoreGained && result.scoreGained > 0) {
          setLastScoreGained(result.scoreGained);
          console.log(`[GAME PAGE] 🎯 Score gained: ${result.scoreGained} points!`);
          
          // Show additional feedback based on score
          if (result.kahootData) {
            console.log(`[GAME PAGE] 🚀 Kahoot performance: ${result.kahootData.speedBonus}, rank: ${result.kahootData.rank}`);
          }
          
          // Optional: Play sound or animation based on score
          if (result.scoreGained >= 175) {
            console.log('[GAME PAGE] ⚡ LIGHTNING FAST BONUS!');
            // Could trigger special animation/sound here
          } else if (result.scoreGained >= 150) {
            console.log('[GAME PAGE] 🚀 SPEED BONUS!');
          }
        } else if (result.scoreGained === 0 && result.correct === false) {
          console.log('[GAME PAGE] ❌ Wrong answer - no points');
          setLastScoreGained(0);
        }
        
      } catch (error) {
        console.error('[GAME PAGE] Error submitting vote:', error);
        alert('Failed to submit vote: ' + error.message);
      }
    }
  };

  // Select answer handler
  const handleSelectAnswer = (answer) => {
    actions.updateGameState({ selectedAnswer: answer });
  };

  // Leave game handler
  const handleLeaveGame = async () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      try {
        console.log('[LEAVE] Starting leave game process...');
        console.log('[LEAVE] Player name:', gameState.playerName);
        
        // Call the leave game API
        const result = await actions.leaveGame(gameState.playerName);
        
        console.log('[LEAVE] Leave game result:', result);
        
        // Reset local state
        setGameResult(null);
        setLastScoreGained(0);
        setHasTimerExpired(false);
        
        // Navigate back to home
        actions.setView('home');
        
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
          setGameResult(null);
          setLastScoreGained(0);
          actions.setView('home');
        }
      }
    }
  };

  // Navigation handlers
  const handleBackToHome = () => {
    setGameResult(null);
    setLastScoreGained(0);
    actions.setView('home');
  };
  
  const handleViewHistory = () => actions.setView('history');

  // 🎮 IMPROVED GAME STATE DETECTION
  console.log('[GAME PAGE] Current state:', {
    hasJoined: gameState.hasJoined,
    gameMode: gameState.gameMode,
    gameResult: !!gameResult,
    currentRound: gameState.currentRound,
    totalPhotos: gameState.totalPhotos
  });

  // Render appropriate screen based on game state
  if (!gameState.hasJoined) {
    return (
      <JoinGameScreen
        playerName={playerName}
        setPlayerName={setPlayerName}
        onJoinGame={handleJoinGame}
        onBack={handleBackToHome}
      />
    );
  }

  if (gameState.gameMode === 'waiting') {
    return (
      <WaitingRoom
        gameState={gameState}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  // 🏁 CRITICAL FIX: Multiple conditions for game finished
  if (gameState.gameMode === 'finished' || gameResult) {
    console.log('[GAME PAGE] 🏁 Showing GameFinished component');
    return (
      <GameFinished
        gameState={gameState}
        gameResult={gameResult}
        onViewHistory={handleViewHistory}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  if (gameState.gameMode === 'playing') {
    return (
      <ActiveGame
        gameState={gameState}
        hasTimerExpired={hasTimerExpired}
        lastScoreGained={lastScoreGained}
        onTimerExpired={handleTimerExpired}
        onSelectAnswer={handleSelectAnswer}
        onSubmitAnswer={handleSubmitAnswer}
      />
    );
  }

  // Fallback for unknown game state
  console.log('[GAME PAGE] ⚠️ Unknown game state, showing loading screen');
  return (
    <LoadingScreen onBack={handleBackToHome} />
  );
};

export default GamePage;