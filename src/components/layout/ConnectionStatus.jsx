import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useGame } from '../../hooks/useGame';

const ConnectionStatus = () => {
  const { gameState } = useGame();
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium ${
        gameState.isConnected 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}>
        {gameState.isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;