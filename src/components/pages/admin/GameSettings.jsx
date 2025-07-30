import React from 'react';
import { Settings } from 'lucide-react';
import Card from '../../ui/Card';

const GameSettings = ({ gameSettings, setGameSettings }) => {
  return (
    <Card>
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Game Settings</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2 text-sm">Time per photo (seconds)</label>
          <input
            type="number"
            min="5"
            max="60"
            value={gameSettings.timePerPhoto}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 10;
              console.log('🎮 Settings updated - timePerPhoto:', newValue); // DEBUG
              setGameSettings(prev => ({ 
                ...prev, 
                timePerPhoto: newValue
              }));
            }}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Current: {gameSettings.timePerPhoto}s per round
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GameSettings;