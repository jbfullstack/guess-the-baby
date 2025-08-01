import React from 'react';
import { Users, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const PlayersManager = ({ gameState, playerManager }) => {
  const { removePlayer, clearAllPlayers } = playerManager;

  return (
    <Card
      title={`Players (${gameState.players.length})`}
      collapsedTitle={`Players (${gameState.players.length}) - ${Object.values(gameState.scores || {}).reduce((sum, score) => sum + score, 0)} total pts`}
      collapsible={true}  // Behavior unchanged by default
      defaultExpanded={true}
      icon={<Users className="w-5 h-5" />}
    >
      {/* Description and Clear All Button */}
      <div className="mb-4">
        {/* Mobile: Button at top right */}
        <div className="flex items-start justify-between gap-3 md:hidden">
          <p className="text-gray-400 text-sm flex-1">
            Manage connected players and their scores
          </p>
          {gameState.players.length > 0 && (
            <Button 
              size="sm" 
              variant="danger" 
              onClick={clearAllPlayers}
              title="Remove all players (keeps game state)"
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Desktop: Stacked layout */}
        <div className="hidden md:flex md:flex-col md:gap-3">
          <p className="text-gray-400 text-sm">
            Manage connected players and their scores
          </p>
          {gameState.players.length > 0 && (
            <div className="flex justify-start">
              <Button 
                size="sm" 
                variant="danger" 
                onClick={clearAllPlayers}
                title="Remove all players (keeps game state)"
                className="flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {gameState.players.length > 0 ? (
          gameState.players.map((player, index) => (
            <div key={player.name || index} className="flex items-center justify-between bg-white/5 rounded-lg p-3 group hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-bold">
                    {(player.name || player).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-white font-medium block">
                      {player.name || player}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {player.joinedAt ? new Date(player.joinedAt).toLocaleTimeString() : 'Recently joined'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-white font-semibold">
                    {gameState.scores[player.name] || 0}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">pts</span>
                </div>
                
                <div className="w-2 h-2 bg-green-400 rounded-full" title="Online"></div>
                
                <button
                  onClick={() => removePlayer(player.name || player)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-full"
                  title={`Remove ${player.name || player} from game`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400 mb-2">No players joined yet</p>
            <p className="text-gray-500 text-sm">Players will appear here when they join the game</p>
          </div>
        )}
      </div>
      
      {gameState.players.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-400">
            <span>
              Total: {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs">
              Hover to remove • Green dot = online
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PlayersManager;