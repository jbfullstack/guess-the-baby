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
    // Store value as-is if it's already a string, otherwise stringify
    const finalValue = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.hset('game:current', field, finalValue);
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
    try {
      const players = await redis.lrange('game:players', 0, -1);
      if (!players || players.length === 0) {
        return [];
      }
      
      // Handle both string JSON and already parsed objects
      const validPlayers = [];
      for (const playerData of players) {
        try {
          if (typeof playerData === 'string') {
            // It's a JSON string, parse it
            const parsed = JSON.parse(playerData);
            validPlayers.push(parsed);
          } else if (typeof playerData === 'object' && playerData !== null) {
            // It's already an object, use as-is
            validPlayers.push(playerData);
          } else {
            console.warn('Unknown player data type:', typeof playerData, playerData);
          }
        } catch (parseError) {
          console.warn('Skipping invalid player data:', playerData, parseError.message);
          // Skip invalid entries
        }
      }
      
      return validPlayers;
    } catch (error) {
      console.error('Error getting players:', error);
      return [];
    }
  },

  // Add player
  async addPlayer(player) {
    try {
      const playerData = {
        ...player,
        joinedAt: new Date().toISOString(),
        lastSeen: Date.now()
      };
      
      console.log('Adding player data:', playerData);
      
      // Check if player already exists
      const players = await this.getPlayers();
      const exists = players.find(p => p && p.name === player.name);
      if (exists) {
        throw new Error('Player name already taken');
      }

      // ALWAYS store as JSON string to avoid parsing issues
      const playerJson = JSON.stringify(playerData);
      console.log('Storing as JSON string:', playerJson);
      
      await redis.lpush('game:players', playerJson);
      await redis.expire('game:players', 7200); // 2 hours TTL
      
      console.log('Player added successfully to Redis');
      return playerData;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
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

  // Clear all players (helper for debugging)
  async clearAllPlayers() {
    await redis.del('game:players');
    return { success: true, message: 'All players cleared' };
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

// REMPLACE la section VotesRedis dans redis.js - FIX UPSTASH BUG

export const VotesRedis = {
  // Submit vote - VERSION SIMPLE qui marche
  async submitVote(round, playerName, answer) {
    const voteKey = `game:votes:round:${round}`;
    
    // Check if player already voted
    const existingVote = await redis.hget(voteKey, `player:${playerName}`);
    if (existingVote) {
      throw new Error('Player already voted this round');
    }

    console.log(`[VOTES] Submitting vote: ${playerName} -> ${answer} for round ${round}`);

    try {
      // SIMPLE APPROACH: Individual operations instead of pipeline
      
      // 1. Store the vote
      await redis.hset(voteKey, `player:${playerName}`, answer);
      console.log(`[VOTES] ✅ Vote stored: ${playerName} -> ${answer}`);
      
      // 2. Get current count, increment, and store back
      const currentCountStr = await redis.hget(voteKey, 'meta:votes_count');
      const currentCount = parseInt(currentCountStr) || 0;
      const newCount = currentCount + 1;
      await redis.hset(voteKey, 'meta:votes_count', newCount.toString());
      console.log(`[VOTES] ✅ Vote count updated: ${currentCount} -> ${newCount}`);
      
      // 3. Set expiry
      await redis.expire(voteKey, 1800);
      
      console.log(`[VOTES] Vote submission completed successfully. Final count: ${newCount}`);
      
      return { votesCount: newCount, answer };
      
    } catch (error) {
      console.error(`[VOTES] ❌ Error submitting vote:`, error);
      throw error;
    }
  },

  // Get votes for a round - FIX UPSTASH BUG
  async getRoundVotes(round) {
    const voteKey = `game:votes:round:${round}`;
    
    try {
      // UPSTASH BUG WORKAROUND: Use individual HGET instead of HGETALL
      console.log(`[VOTES] 🔧 Getting votes with Upstash workaround for round ${round}`);
      
      // Get metadata first
      const [votesCountStr, totalPlayersStr] = await Promise.all([
        redis.hget(voteKey, 'meta:votes_count'),
        redis.hget(voteKey, 'meta:total_players')
      ]);
      
      const votesCount = parseInt(votesCountStr) || 0;
      const totalPlayers = parseInt(totalPlayersStr) || 0;
      
      console.log(`[VOTES] 📊 Meta data: votesCount=${votesCount}, totalPlayers=${totalPlayers}`);
      
      // Get all field names to find player votes
      const allFields = await redis.hkeys(voteKey);
      console.log(`[VOTES] 🔑 All field keys:`, allFields);
      
      const votes = {};
      
      // Filter and get player votes only
      const playerFields = allFields.filter(field => 
        field && 
        typeof field === 'string' && 
        field.startsWith('player:') &&
        field.length > 7 // "player:" + at least 1 char
      );
      
      console.log(`[VOTES] 👥 Player fields found:`, playerFields);
      
      // Get votes for each player
      for (const field of playerFields) {
        try {
          const playerName = field.replace('player:', '');
          const vote = await redis.hget(voteKey, field);
          if (vote && typeof vote === 'string') {
            votes[playerName] = vote;
            console.log(`[VOTES] ✅ Got vote: ${playerName} -> ${vote}`);
          }
        } catch (fieldError) {
          console.warn(`[VOTES] ⚠️ Error getting vote for field ${field}:`, fieldError);
        }
      }
      
      console.log(`[VOTES] ✅ Final parsed votes for round ${round}:`, { 
        votes, 
        votesCount, 
        totalPlayers,
        actualVoteCount: Object.keys(votes).length 
      });
      
      return { votes, votesCount, totalPlayers };
      
    } catch (error) {
      console.error(`[VOTES] ❌ Error getting votes for round ${round}:`, error);
      return { votes: {}, votesCount: 0, totalPlayers: 0 };
    }
  },

  // Clear votes for a round
  async clearRoundVotes(round) {
    console.log(`[VOTES] 🧹 Clearing votes for round ${round}`);
    await redis.del(`game:votes:round:${round}`);
  },

  // Set total players for vote counting
  async setTotalPlayers(round, totalPlayers) {
    const voteKey = `game:votes:round:${round}`;
    console.log(`[VOTES] 👥 Setting total players for round ${round}: ${totalPlayers}`);
    await redis.hset(voteKey, 'meta:total_players', totalPlayers.toString());
    await redis.expire(voteKey, 1800);
  },

  // FORCE delete specific round (for testing)
  async forceDeleteRound(round) {
    const voteKey = `game:votes:round:${round}`;
    console.log(`[VOTES] 🧨 FORCE DELETE round ${round}`);
    
    try {
      // Get all keys first
      const allFields = await redis.hkeys(voteKey);
      console.log(`[VOTES] Fields to delete:`, allFields);
      
      // Delete the entire hash
      const result = await redis.del(voteKey);
      console.log(`[VOTES] ✅ Deleted round ${round}, result:`, result);
      
      return { success: true, deletedFields: allFields.length };
    } catch (error) {
      console.error(`[VOTES] ❌ Error deleting round ${round}:`, error);
      return { success: false, error: error.message };
    }
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