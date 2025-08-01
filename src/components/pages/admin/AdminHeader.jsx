import React from 'react';
import { Shield, Users } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const AdminHeader = ({ actions, totalActivePlayers = 0, totalConnectedPlayers = 0, totalPlayers = 0 }) => {
  return (
    <Card
      title="Admin Panel"
      collapsedTitle={`Admin Panel (${totalActivePlayers}/${totalConnectedPlayers}/${totalPlayers})`}
      collapsible={true}
      defaultExpanded={true}
      icon={<Shield className="w-5 h-5" />}
    >
      {/* Description and Controls - Mobile Optimized */}
      <div className="mb-4">
        {/* Top row: Description + Exit Button (always horizontal) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-gray-300">Manage your baby photo guessing game</p>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => actions.authenticateAdmin(false)}
            className="flex-shrink-0"
          >
            Exit Admin
          </Button>
        </div>
        
        {/* Player Stats Row */}
        <div className="flex items-center space-x-2 text-sm">
          <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="text-blue-400 font-medium">{totalPlayers} players</span>
          <span className="text-gray-400">•</span>
          <span className="text-green-400">{totalActivePlayers} active</span>
          <span className="text-gray-400">•</span>
          <span className="text-yellow-400">{totalConnectedPlayers} online</span>
        </div>
      </div>

      {/* Detailed Player Stats */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-2">
            Detailed Player Status
          </div>
          <div className="text-lg font-mono">
            <span className="text-green-400" title="Players currently voting/active">{totalActivePlayers}</span>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-yellow-400" title="Players connected/online">{totalConnectedPlayers}</span>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-blue-400" title="Total players in game">{totalPlayers}</span>
          </div>
          <div className="text-xs text-gray-500 mt-2 space-x-4">
            <span className="text-green-400">● Active (voting)</span>
            <span className="text-yellow-400">● Connected</span>
            <span className="text-blue-400">● Total</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AdminHeader;