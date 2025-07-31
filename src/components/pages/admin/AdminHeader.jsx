import React from 'react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const AdminHeader = ({ actions, totalActivePlayers = 0, totalConnectedPlayers = 0, totalPlayers = 0 }) => {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-300">Manage your baby photo guessing game</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">
              Player Status
            </div>
            <div className="text-sm font-mono">
              <span className="text-green-400" title="Players currently voting/active">{totalActivePlayers}</span>
              <span className="text-gray-400">/</span>
              <span className="text-yellow-400" title="Players connected/online">{totalConnectedPlayers}</span>
              <span className="text-gray-400">/</span>
              <span className="text-blue-400" title="Total players in game">{totalPlayers}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Active/Connected/Total
            </div>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => actions.authenticateAdmin(false)}
          >
            Exit Admin
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AdminHeader;