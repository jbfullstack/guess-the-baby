import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Crown, BarChart3, Filter } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const HistoryPage = () => {
  const { gameState, actions } = useGame();
  const [filter, setFilter] = useState('all'); // all, recent, top
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    actions.getHistory();
  }, []);

  // Mock history data (in real app, comes from GitHub)
  const mockHistory = [
    {
      id: '1',
      date: '2024-07-28T10:30:00Z',
      players: [
        { name: 'Alice', score: 8 },
        { name: 'Bob', score: 6 },
        { name: 'Charlie', score: 4 },
        { name: 'Diana', score: 7 }
      ],
      winner: 'Alice',
      totalRounds: 10,
      duration: '8 minutes',
      photosUsed: 10
    },
    {
      id: '2',
      date: '2024-07-27T15:45:00Z',
      players: [
        { name: 'Bob', score: 9 },
        { name: 'Charlie', score: 8 },
        { name: 'Eve', score: 5 }
      ],
      winner: 'Bob',
      totalRounds: 12,
      duration: '10 minutes',
      photosUsed: 12
    },
    {
      id: '3',
      date: '2024-07-26T20:15:00Z',
      players: [
        { name: 'Diana', score: 15 },
        { name: 'Alice', score: 12 },
        { name: 'Charlie', score: 9 },
        { name: 'Bob', score: 11 },
        { name: 'Eve', score: 8 }
      ],
      winner: 'Diana',
      totalRounds: 18,
      duration: '15 minutes',
      photosUsed: 18
    }
  ];

  const historyToShow = gameState.gameHistory.length > 0 ? gameState.gameHistory : mockHistory;

  const filteredHistory = historyToShow.filter(game => {
    switch (filter) {
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(game.date) > oneWeekAgo;
      case 'top':
        return game.players.length >= 4; // Games with 4+ players
      default:
        return true;
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerStats = () => {
    const stats = {};
    historyToShow.forEach(game => {
      game.players.forEach(player => {
        if (!stats[player.name]) {
          stats[player.name] = { games: 0, totalScore: 0, wins: 0 };
        }
        stats[player.name].games++;
        stats[player.name].totalScore += player.score;
        if (player.name === game.winner) {
          stats[player.name].wins++;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        avgScore: (data.totalScore / data.games).toFixed(1),
        winRate: ((data.wins / data.games) * 100).toFixed(0)
      }))
      .sort((a, b) => b.wins - a.wins);
  };

  if (selectedGame) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Game Details</h1>
              <Button 
                variant="secondary" 
                onClick={() => setSelectedGame(null)}
              >
                Back to History
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Game Info */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Game Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Date:</span>
                      <span className="text-white">{formatDate(selectedGame.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white">{selectedGame.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Photos Used:</span>
                      <span className="text-white">{selectedGame.photosUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Rounds:</span>
                      <span className="text-white">{selectedGame.totalRounds}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-yellow-400">Winner</h3>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedGame.winner}</p>
                </div>
              </div>

              {/* Player Scores */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Final Scores</h3>
                <div className="space-y-2">
                  {selectedGame.players
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div 
                        key={player.name}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-bold ${
                            index === 0 ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            #{index + 1}
                          </span>
                          <span className={`font-medium ${
                            index === 0 ? 'text-yellow-400' : 'text-white'
                          }`}>
                            {player.name}
                          </span>
                          {index === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                        </div>
                        <span className={`font-bold ${
                          index === 0 ? 'text-yellow-400' : 'text-white'
                        }`}>
                          {player.score}/{selectedGame.totalRounds}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Game History</h1>
              <p className="text-gray-300">Track your baby photo game sessions</p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => actions.setView('home')}
            >
              Back to Home
            </Button>
          </div>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Stats Overview */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{historyToShow.length}</p>
              <p className="text-gray-300 text-sm">Total Games</p>
            </Card>
            
            <Card className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold text-white">
                {Math.round(historyToShow.reduce((acc, game) => acc + game.players.length, 0) / historyToShow.length) || 0}
              </p>
              <p className="text-gray-300 text-sm">Avg Players</p>
            </Card>

            <Card>
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Filter</h3>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Games' },
                  { value: 'recent', label: 'Recent (7 days)' },
                  { value: 'top', label: 'Big Games (4+ players)' }
                ].map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filter"
                      value={option.value}
                      checked={filter === option.value}
                      onChange={(e) => setFilter(e.target.value)}
                      className="w-3 h-3 text-purple-600"
                    />
                    <span className="text-gray-300 text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>

          {/* Game History */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Recent Games</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(game => (
                    <div 
                      key={game.id}
                      onClick={() => setSelectedGame(game)}
                      className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-medium">
                            {formatDate(game.date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-medium">{game.winner}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <span>{game.players.length} players • {game.duration}</span>
                        <span>{game.photosUsed} photos</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-400">No games found</p>
                    <p className="text-gray-500 text-sm">Try changing the filter</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Player Leaderboard */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Top Players</h2>
              </div>
              
              <div className="space-y-2">
                {getPlayerStats().slice(0, 5).map((player, index) => (
                  <div 
                    key={player.name}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-bold ${
                        index === 0 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className={`text-sm font-medium ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {player.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${
                        index === 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {player.wins}W
                      </div>
                      <div className="text-xs text-gray-400">
                        {player.winRate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;