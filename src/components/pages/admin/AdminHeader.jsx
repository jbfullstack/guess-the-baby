import React from 'react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const AdminHeader = ({ actions, totalVotes, totalPlayers }) => {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-300">Manage your baby photo guessing game</p>
        </div>
        <div className="flex space-x-2">
          <div className="text-xs text-gray-400">
            Live: {totalVotes}/{totalPlayers}
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