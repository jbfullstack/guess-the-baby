import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Users, Crown, BarChart3, Filter, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const HistoryPage = () => {
  const { gameState, actions } = useGame();
  const [filter, setFilter] = useState('all'); // all, recent, top
  const [selectedGame, setSelectedGame] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGameHistory();
  }, []);

  const loadGameHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Loading game history...');
      
      await actions.getHistory();
      console.log('✅ Game history loaded:', gameState.gameHistory?.length || 0, 'games');
    } catch (error) {
      console.error('❌ Failed to load game history:', error);
      setError(error.message || 'Failed to load game history');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 CRITICAL: Use ONLY real data - NO mock data anymore!
  const historyToShow = gameState.gameHistory || [];

  const filteredHistory = historyToShow.filter(game => {
    switch (filter) {
      case 'recent':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const gameDate = new Date(game.endedAt || game.date);
        return gameDate > oneWeekAgo;
      case 'top':
        return game.players && game.players.length >= 4; // Games with 4+ players
      default:
        return true;
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    // Handle both timestamp and ISO string formats
    let date;
    if (typeof dateString === 'number') {
      date = new Date(dateString);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerStats = () => {
    if (!historyToShow.length) return [];
    
    const stats = {};
    
    historyToShow.forEach(game => {
      if (!game.players || !Array.isArray(game.players)) return;
      
      game.players.forEach(player => {
        const playerName = player.name;
        const playerScore = player.score || 0;
        
        if (!stats[playerName]) {
          stats[playerName] = { games: 0, totalScore: 0, wins: 0 };
        }
        
        stats[playerName].games++;
        stats[playerName].totalScore += playerScore;
        
        if (playerName === game.winner) {
          stats[playerName].wins++;
        }
      });
    });

    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        avgScore: (data.totalScore / data.games).toFixed(1),
        winRate: data.games > 0 ? ((data.wins / data.games) * 100).toFixed(0) : '0'
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
                      <span className="text-white">{formatDate(selectedGame.endedAt || selectedGame.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Duration:</span>
                      <span className="text-white">{selectedGame.duration || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Photos Used:</span>
                      <span className="text-white">{selectedGame.photosUsed || selectedGame.totalRounds || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Rounds:</span>
                      <span className="text-white">{selectedGame.totalRounds || selectedGame.photosUsed || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Game ID:</span>
                      <span className="text-white font-mono text-xs">{selectedGame.gameId || selectedGame.id || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Time per Photo:</span>
                      <span className="text-white">{selectedGame.settings?.timePerPhoto || 10}s</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-yellow-400">Winner</h3>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedGame.winner || 'Unknown'}</p>
                </div>
              </div>

              {/* Player Scores */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Final Scores</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedGame.players && selectedGame.players.length > 0 ? (
                    selectedGame.players
                      // 🔥 FILTER: Only show real players (valid names and score > 0 OR meaningful names)
                      .filter(player => {
                        const name = player.name || '';
                        const score = player.score || 0;
                        
                        // Filter out players with suspicious names (just numbers, empty, etc.)
                        const isValidName = name.length > 0 && 
                                          name !== 'Unknown Player' &&
                                          !/^[0-9]+$/.test(name) && // Not just numbers like "0", "1", "2"
                                          name.trim().length > 0;
                        
                        // Keep players with valid names OR players with points
                        return isValidName || score > 0;
                      })
                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                      .map((player, index) => (
                        <div 
                          key={player.name || index}
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
                              {player.name || 'Unknown Player'}
                            </span>
                            {index === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                          </div>
                          <span className={`font-bold text-2xl ${
                            index === 0 ? 'text-yellow-400' : 'text-white'
                          }`}>
                            {player.score || 0}
                          </span>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      No player data available
                    </div>
                  )}
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
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                onClick={loadGameHistory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => actions.setView('home')}
              >
                Back to Home
              </Button>
            </div>
          </div>
        </Card>

        {/* Error state */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold">Error loading game history:</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <Card className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-400" />
            <p className="text-gray-300">Loading game history from GitHub...</p>
          </Card>
        )}

        {/* Main content */}
        {!isLoading && (
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
                  {historyToShow.length > 0 
                    ? Math.round(historyToShow.reduce((acc, game) => {
                        return acc + (game.players ? game.players.length : 0);
                      }, 0) / historyToShow.length) 
                    : 0
                  }
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
                    filteredHistory.map((game, index) => (
                      <div 
                        key={game.gameId || game.id || index}
                        onClick={() => setSelectedGame(game)}
                        className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-medium">
                              {formatDate(game.endedAt || game.date)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 font-medium">{game.winner || 'Unknown'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-300">
                          <span>{game.players ? game.players.length : 0} players • {game.duration || 'Unknown duration'}</span>
                          <span>{game.photosUsed || game.totalRounds || '?'} photos</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-400">
                        {historyToShow.length === 0 ? 'No games played yet' : 'No games found'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {historyToShow.length === 0 ? 'Start a game to see it here!' : 'Try changing the filter'}
                      </p>
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
                  {getPlayerStats().slice(0, 5).length > 0 ? (
                    getPlayerStats().slice(0, 5).map((player, index) => (
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
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">No player stats yet</p>
                      <p className="text-xs text-gray-500">Play some games first!</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;