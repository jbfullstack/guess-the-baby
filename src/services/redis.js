// Redis service for real-time game state
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = Redis.fromEnv();

// Game state management
export const GameStateRedis = {
  // Get current game state
  async getCurrentGame() {
    const gameState = await redis.hgetall('game:current');
    return gameState || {
      gameId: null,
      gameMode: 'waiting',
      currentRound: 0,
      currentPhoto: null,
      totalPhotos: 0,
      startTime: null
    };
  },

  // Set game state
  async setCurrentGame(gameState) {
    // Set TTL to 2 hours
    await redis.hset('game:current', gameState);
    await redis.expire('game:current', 7200);
    return gameState;
  },

  // Update specific game field
  async updateGameField(field, value) {
    await redis.hset('game:current', field, JSON.stringify(value));
    return value;
  },

  // Reset game
  async resetGame() {
    const pipeline = redis.pipeline();
    pipeline.del('game:current');
    pipeline.del('game:players');
    pipeline.del('game:scores');
    // Delete all vote rounds
    for (let i = 1; i <= 20; i++) {
      pipeline.del(`game:votes:round:${i}`);
    }
    await pipeline.exec();
    return { success: true };
  }
};

// Players management
export const PlayersRedis = {
  // Get all players
  async getPlayers() {
    const players = await redis.lrange('game:players', 0, -1);
    return players.map(p => JSON.parse(p));
  },

  // Add player
  async addPlayer(player) {
    const playerData = {
      ...player,
      joinedAt: new Date().toISOString(),
      lastSeen: Date.now()
    };
    
    // Check if player already exists
    const players = await this.getPlayers();
    const exists = players.find(p => p.name === player.name);
    if (exists) {
      throw new Error('Player name already taken');
    }

    await redis.lpush('game:players', JSON.stringify(playerData));
    await redis.expire('game:players', 7200); // 2 hours TTL
    return playerData;
  },

  // Remove player
  async removePlayer(playerName) {
    const players = await this.getPlayers();
    const filteredPlayers = players.filter(p => p.name !== playerName);
    
    await redis.del('game:players');
    if (filteredPlayers.length > 0) {
      const pipeline = redis.pipeline();
      filteredPlayers.forEach(player => {
        pipeline.lpush('game:players', JSON.stringify(player));
      });
      pipeline.expire('game:players', 7200);
      await pipeline.exec();
    }
    return filteredPlayers;
  },

  // Update player heartbeat
  async updateHeartbeat(playerName) {
    await redis.hset('players:online', playerName, Date.now());
    await redis.expire('players:online', 60); // 1 minute TTL
  },

  // Get online players
  async getOnlinePlayers() {
    const online = await redis.hgetall('players:online') || {};
    const now = Date.now();
    const activePlayers = {};
    
    // Only keep players seen in last 30 seconds
    Object.entries(online).forEach(([name, lastSeen]) => {
      if (now - parseInt(lastSeen) < 30000) {
        activePlayers[name] = lastSeen;
      }
    });
    
    return activePlayers;
  }
};

// Scores management
export const ScoresRedis = {
  // Get all scores
  async getScores() {
    const scores = await redis.hgetall('game:scores');
    // Convert string values back to numbers
    const numericScores = {};
    Object.entries(scores || {}).forEach(([name, score]) => {
      numericScores[name] = parseInt(score) || 0;
    });
    return numericScores;
  },

  // Set player score
  async setScore(playerName, score) {
    await redis.hset('game:scores', playerName, score);
    await redis.expire('game:scores', 7200);
    return score;
  },

  // Increment player score
  async incrementScore(playerName, points = 1) {
    const newScore = await redis.hincrby('game:scores', playerName, points);
    await redis.expire('game:scores', 7200);
    return newScore;
  },

  // Reset all scores
  async resetScores() {
    await redis.del('game:scores');
    return {};
  },

  // Initialize scores for players
  async initializeScores(playerNames) {
    const pipeline = redis.pipeline();
    playerNames.forEach(name => {
      pipeline.hset('game:scores', name, 0);
    });
    pipeline.expire('game:scores', 7200);
    await pipeline.exec();
    
    return playerNames.reduce((acc, name) => {
      acc[name] = 0;
      return acc;
    }, {});
  }
};

// Votes management
export const VotesRedis = {
  // Submit vote
  async submitVote(round, playerName, answer) {
    const voteKey = `game:votes:round:${round}`;
    
    // Check if player already voted
    const existingVote = await redis.hget(voteKey, playerName);
    if (existingVote) {
      throw new Error('Player already voted this round');
    }

    // Submit vote and increment count atomically
    const pipeline = redis.pipeline();
    pipeline.hset(voteKey, playerName, answer);
    pipeline.hincrby(voteKey, 'votes_count', 1);
    pipeline.expire(voteKey, 1800); // 30 minutes TTL
    
    const results = await pipeline.exec();
    const votesCount = results[1].result;
    
    return { votesCount, answer };
  },

  // Get votes for a round
  async getRoundVotes(round) {
    const voteKey = `game:votes:round:${round}`;
    const votes = await redis.hgetall(voteKey);
    
    if (!votes) return { votes: {}, votesCount: 0 };
    
    const { votes_count, ...playerVotes } = votes;
    return {
      votes: playerVotes,
      votesCount: parseInt(votes_count) || 0
    };
  },

  // Clear votes for a round
  async clearRoundVotes(round) {
    await redis.del(`game:votes:round:${round}`);
  },

  // Set total players for vote counting
  async setTotalPlayers(round, totalPlayers) {
    const voteKey = `game:votes:round:${round}`;
    await redis.hset(voteKey, 'total_players', totalPlayers);
    await redis.expire(voteKey, 1800);
  }
};

// Real-time events (can replace Pusher)
export const EventsRedis = {
  // Publish event
  async publish(channel, event, data) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    await redis.publish(channel, message);
  },

  // Subscribe to events (for server-side)
  async subscribe(channel, callback) {
    // Note: Redis pub/sub requires WebSocket or long polling for browser
    // For now, we'll keep using Pusher for client notifications
    console.log('Redis pub/sub setup for server-side events');
  }
};

// Health check
export const RedisHealth = {
  async ping() {
    try {
      const result = await redis.ping();
      return { status: 'healthy', result, timestamp: Date.now() };
    } catch (error) {
      return { status: 'error', error: error.message, timestamp: Date.now() };
    }
  },

  async getInfo() {
    const info = await redis.info();
    return info;
  }
};

// Export default Redis client for custom operations
export default redis;