import React from 'react';

const LiveVotesDisplay = ({ 
  displayVotes, 
  totalVotes, 
  totalPlayers, 
  gameState, 
  realtimeVotes 
}) => {
  const { liveVotes } = realtimeVotes;

  return (
    <div className="bg-white/5 rounded-lg p-3 space-y-1">
      {/* Debug info */}
      <div className="text-xs text-yellow-400 mb-2 font-mono bg-black/20 p-1 rounded">
        Debug: Live={Object.keys(liveVotes).length} | State={Object.keys(gameState.votes || {}).length} | Count={totalVotes}/{totalPlayers}
      </div>
      
      {/* Current Round Info */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2 pb-1 border-b border-white/10">
        <span>Round {gameState.currentRound || 1}</span>
        <span>{totalVotes}/{totalPlayers} voted</span>
      </div>
      
      {/* Real Votes Display */}
      {displayVotes.length > 0 ? (
        <div className="space-y-1">
          {displayVotes.map((vote, index) => (
            <div key={`${vote.player}-${index}`} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                  {vote.player.charAt(0).toUpperCase()}
                </div>
                <span className="text-white font-medium">{vote.player}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-300 font-medium">{vote.answer}</span>
                <div className="w-2 h-2 bg-green-400 rounded-full" title="Vote received"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-gray-400 text-sm">No votes yet this round</p>
          <p className="text-gray-500 text-xs mt-1">Votes will appear here as players answer</p>
        </div>
      )}
      
      {/* Progress Bar */}
      {totalPlayers > 0 && (
        <div className="mt-3 pt-2 border-t border-white/20">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Voting Progress</span>
            <span>{Math.round((totalVotes / totalPlayers) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-purple-400 h-1.5 rounded-full transition-all duration-300" 
              style={{ width: `${(totalVotes / totalPlayers) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* All Voted Indicator */}
      {totalVotes >= totalPlayers && totalPlayers > 0 && (
        <div className="mt-2 bg-green-500/20 border border-green-500/30 rounded-lg p-2">
          <p className="text-green-400 text-xs text-center font-medium">
            ✅ All players have voted! Round ending soon...
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveVotesDisplay;