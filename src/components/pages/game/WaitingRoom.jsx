import React from 'react';
import { Users, Timer, X } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const WaitingRoom = ({ gameState, onLeaveGame }) => {
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

        <div className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              💡 You can leave at any time. Other players and the admin will be notified.
            </p>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={onLeaveGame}
            className="w-full"
          >
            <X className="w-4 h-4 mr-2" />
            Leave Game
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WaitingRoom;