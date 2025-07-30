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
    setLastScoreGained(0);
  }, [gameState.currentRound]);

  // Join game handler
  const handleJoinGame = async (name) => {
    await actions.joinGame(name);
  };

  // Submit answer handler
  const handleSubmitAnswer = async () => {
    if (gameState.selectedAnswer && gameState.selectedAnswer !== 'NO_ANSWER') {
      try {
        const result = await actions.submitVote(gameState.selectedAnswer);
        
        // Display score gained
        if (result.scoreGained) {
          setLastScoreGained(result.scoreGained);
          console.log(`🎯 Score gained: ${result.scoreGained} points!`);
        }
        
      } catch (error) {
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

  // Navigation handlers
  const handleBackToHome = () => actions.setView('home');
  const handleViewHistory = () => actions.setView('history');

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

  if (gameState.gameMode === 'finished' || gameResult) {
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
  return (
    <LoadingScreen onBack={handleBackToHome} />
  );
};

export default GamePage;