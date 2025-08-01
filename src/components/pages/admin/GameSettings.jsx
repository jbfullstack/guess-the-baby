import React from 'react';
import { Settings } from 'lucide-react';
import Card from '../../ui/Card';

const GameSettings = ({ gameSettings, setGameSettings }) => {
  return (
    <Card
      title="Game Settings"
      collapsedTitle={`Game Settings (${gameSettings.timePerPhoto}s per photo)`}
      collapsibleOnlyOnMobile={true}
      defaultExpanded={true}
      icon={<Settings className="w-5 h-5" />}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-2 text-sm font-medium">
            Time per photo (seconds)
          </label>
          <div className="space-y-2">
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
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 transition-all"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Range: 5-60 seconds</span>
              <span className="text-purple-400 font-medium">
                Current: {gameSettings.timePerPhoto}s per round
              </span>
            </div>
          </div>
        </div>

        {/* Quick presets for common times */}
        <div>
          <p className="text-gray-400 text-xs mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 20, 30].map(time => (
              <button
                key={time}
                onClick={() => setGameSettings(prev => ({ ...prev, timePerPhoto: time }))}
                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                  gameSettings.timePerPhoto === time
                    ? 'bg-purple-400/20 border-purple-400 text-purple-300'
                    : 'bg-white/5 border-white/20 text-gray-400 hover:border-purple-400/50 hover:text-purple-400'
                }`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GameSettings;