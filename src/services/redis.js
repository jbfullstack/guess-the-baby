// Redis service for real-time game state - FIXED UPSTASH BUG
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = Redis.fromEnv();

// Game state management - FIX: Use individual keys instead of corrupted hashes
export const GameStateRedis = {
  // Get current game state - FIXED: Use separate keys to avoid Upstash hash corruption
  async getCurrentGame() {
    try {
      console.log('[REDIS] Getting current game state with separate keys...');
      
      // Use individual keys instead of hgetall to avoid corruption
      const [
        gameId,
        gameMode,
        currentRound,
        currentPhoto,
        totalPhotos,
        startTime,
        selectedPhotos,
        settings,
        roundStartTime,
        winner,
        endedAt
      ] = await Promise.all([
        redis.get('game:id'),
        redis.get('game:mode'),
        redis.get('game:round'),  
        redis.get('game:photo'),
        redis.get('game:total'),
        redis.get('game:start'),
        redis.get('game:photos'),
        redis.get('game:settings'),
        redis.get('game:roundstart'),
        redis.get('game:winner'),
        redis.get('game:ended')
      ]);

      console.log('[REDIS] Raw values:', {
        gameId, gameMode, currentRound, totalPhotos, currentPhoto: currentPhoto ? 'present' : 'null'
      });

      // SAFER JSON PARSING - Handle potential corruption
      const safeJsonParse = (jsonString, fallback = null) => {
        if (!jsonString || jsonString === 'null' || jsonString === 'undefined') {
          return fallback;
        }
        try {
          // Check if it's already an object (shouldn't happen, but safety first)
          if (typeof jsonString === 'object') {
            console.warn('[REDIS] ⚠️ Got object instead of string for JSON field:', jsonString);
            return jsonString;
          }
          return JSON.parse(jsonString);
        } catch (error) {
          console.error('[REDIS] ❌ JSON parse error for:', jsonString, error.message);
          return fallback;
        }
      };

      const gameState = {
        gameId: gameId || null,
        gameMode: gameMode || 'waiting',
        currentRound: parseInt(currentRound) || 0,
        currentPhoto: safeJsonParse(currentPhoto, null),
        totalPhotos: parseInt(totalPhotos) || 0,
        startTime: startTime || null,
        selectedPhotos: safeJsonParse(selectedPhotos, []),
        settings: safeJsonParse(settings, { timePerPhoto: 10 }),
        roundStartTime: roundStartTime || null,
        winner: winner || null,
        endedAt: endedAt || null
      };

      console.log('[REDIS] ✅ Parsed game state:', {
        ...gameState,
        selectedPhotos: `${gameState.selectedPhotos.length} photos`,
        currentPhoto: gameState.currentPhoto ? 'present' : 'null'
      });
      return gameState;
      
    } catch (error) {
      console.error('[REDIS] Error getting game state:', error);
      return {
        gameId: null,
        gameMode: 'waiting',
        currentRound: 0,
        currentPhoto: null,
        totalPhotos: 0,
        startTime: null,
        selectedPhotos: [],
        settings: { timePerPhoto: 10 }
      };
    }
  },

  // Set game state - FIXED: Use individual keys
  async setCurrentGame(gameState) {
    try {
      console.log('[REDIS] Setting game state with separate keys...');
      
      const pipeline = redis.pipeline();
      
      // Store each field separately to avoid hash corruption
      if (gameState.gameId !== undefined) pipeline.set('game:id', gameState.gameId, { ex: 7200 });
      if (gameState.gameMode !== undefined) pipeline.set('game:mode', gameState.gameMode, { ex: 7200 });
      if (gameState.currentRound !== undefined) pipeline.set('game:round', gameState.currentRound.toString(), { ex: 7200 });
      if (gameState.currentPhoto !== undefined) pipeline.set('game:photo', JSON.stringify(gameState.currentPhoto), { ex: 7200 });
      if (gameState.totalPhotos !== undefined) pipeline.set('game:total', gameState.totalPhotos.toString(), { ex: 7200 });
      if (gameState.startTime !== undefined) pipeline.set('game:start', gameState.startTime, { ex: 7200 });
      if (gameState.selectedPhotos !== undefined) pipeline.set('game:photos', JSON.stringify(gameState.selectedPhotos), { ex: 7200 });
      if (gameState.settings !== undefined) pipeline.set('game:settings', JSON.stringify(gameState.settings), { ex: 7200 });
      if (gameState.roundStartTime !== undefined) pipeline.set('game:roundstart', gameState.roundStartTime.toString(), { ex: 7200 });
      if (gameState.winner !== undefined) pipeline.set('game:winner', gameState.winner, { ex: 7200 });
      if (gameState.endedAt !== undefined) pipeline.set('game:ended', gameState.endedAt, { ex: 7200 });

      await pipeline.exec();
      console.log('[REDIS] ✅ Game state set successfully');
      return gameState;
      
    } catch (error) {
      console.error('[REDIS] Error setting game state:', error);
      throw error;
    }
  },

  // Update specific game field - FIXED: Use individual keys with better serialization
  async updateGameField(field, value) {
    try {
      const keyMap = {
        gameId: 'game:id',
        gameMode: 'game:mode', 
        currentRound: 'game:round',
        currentPhoto: 'game:photo',
        totalPhotos: 'game:total',
        startTime: 'game:start',
        selectedPhotos: 'game:photos',
        settings: 'game:settings',
        roundStartTime: 'game:roundstart',
        winner: 'game:winner',
        endedAt: 'game:ended'
      };

      const redisKey = keyMap[field];
      if (!redisKey) {
        throw new Error(`Unknown field: ${field}`);
      }

      // BETTER SERIALIZATION - Handle objects safely
      let finalValue = value;
      if (value === null || value === undefined) {
        finalValue = null;
      } else if (typeof value === 'object' && value !== null) {
        // Ensure proper JSON serialization for objects
        try {
          finalValue = JSON.stringify(value);
          console.log(`[REDIS] 📦 Serializing object for ${field}:`, finalValue.substring(0, 100) + '...');
        } catch (jsonError) {
          console.error(`[REDIS] ❌ JSON stringify error for ${field}:`, jsonError);
          throw new Error(`Failed to serialize ${field}: ${jsonError.message}`);
        }
      } else if (typeof value !== 'string') {
        finalValue = value.toString();
      }

      await redis.set(redisKey, finalValue, { ex: 7200 });
      console.log(`[REDIS] ✅ Updated ${field} = ${typeof finalValue === 'string' && finalValue.length > 50 ? finalValue.substring(0, 50) + '...' : finalValue}`);
      return value;
      
    } catch (error) {
      console.error(`[REDIS] Error updating field ${field}:`, error);
      throw error;
    }
  },

  // Reset game - FIXED: Delete individual keys
  async resetGame() {
    try {
      console.log('[REDIS] 🧹 Resetting game with individual key cleanup...');
      
      const keysToDelete = [
        'game:id', 'game:mode', 'game:round', 'game:photo', 'game:total',
        'game:start', 'game:photos', 'game:settings', 'game:roundstart',
        'game:winner', 'game:ended'
      ];

      const pipeline = redis.pipeline();
      
      // Delete game state keys
      keysToDelete.forEach(key => pipeline.del(key));
      
      // Delete related data
      pipeline.del('game:players');
      pipeline.del('game:scores');
      
      // Delete all vote rounds
      for (let i = 1; i <= 20; i++) {
        pipeline.del(`vote:r${i}:count`);
        pipeline.del(`vote:r${i}:total`);
      }
      
      // Delete all vote player keys (pattern deletion)
      const voteKeys = await redis.keys('vote:r*:player:*');
      if (voteKeys && voteKeys.length > 0) {
        voteKeys.forEach(key => pipeline.del(key));
      }
      
      await pipeline.exec();
      console.log('[REDIS] ✅ Game reset completed');
      return { success: true };
      
    } catch (error) {
      console.error('[REDIS] Error resetting game:', error);
      throw error;
    }
  }
};

// Keep the rest of the Redis services unchanged
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
    try {
      const scoreKeys = await redis.keys('score:*');
      const scores = {};
      
      if (scoreKeys.length === 0) {
        return {};
      }
      
      // Get all score values
      const values = await redis.mget(...scoreKeys);
      
      scoreKeys.forEach((key, index) => {
        // Extract player name from key: score:playerName -> playerName
        const playerName = key.replace('score:', '');
        scores[playerName] = parseInt(values[index]) || 0;
      });
      
      console.log('[SCORES] 📊 Retrieved scores:', scores);
      return scores;
    } catch (error) {
      console.error('[SCORES] Error getting scores:', error);
      return {};
    }
  },

  // MODIFIER setScore :
  async setScore(playerName, score) {
    const scoreKey = `score:${playerName}`;
    await redis.set(scoreKey, score.toString(), { ex: 7200 });
    console.log(`[SCORES] 🎯 Set ${scoreKey} = ${score}`);
    return score;
  },

  // MODIFIER incrementScore :
  async incrementScore(playerName, points = 1) {
    const scoreKey = `score:${playerName}`;
    const currentScore = await redis.get(scoreKey);
    const newScore = (parseInt(currentScore) || 0) + points;
    await redis.set(scoreKey, newScore.toString(), { ex: 7200 });
    console.log(`[SCORES] 📈 Incremented ${scoreKey}: ${currentScore} + ${points} = ${newScore}`);
    return newScore;
  },

  // MODIFIER resetScores :
  async resetScores() {
    const scoreKeys = await redis.keys('score:*');
    if (scoreKeys.length > 0) {
      await redis.del(...scoreKeys);
      console.log('[SCORES] 🧹 Deleted score keys:', scoreKeys);
    }
    return {};
  },

  // Initialize scores for players
 async initializeScores(playerNames) {
  try {
    console.log('[SCORES] 🚀 Initializing scores with individual keys for:', playerNames);
    
    // 🔥 FIX: Use individual keys instead of hash
    // Clear existing score keys
    const existingKeys = await redis.keys('score:*');
    if (existingKeys.length > 0) {
      await redis.del(...existingKeys);
      console.log('[SCORES] 🧹 Cleared existing score keys:', existingKeys);
    }
    
    if (!playerNames || playerNames.length === 0) {
      return {};
    }
    
    // Set individual scores with separate keys
    const results = {};
    for (const name of playerNames) {
      if (name && typeof name === 'string' && name.trim().length > 0) {
        const cleanName = name.trim();
        const scoreKey = `score:${cleanName}`;
        
        console.log(`[SCORES] 🎯 Setting individual key: ${scoreKey} = 0`);
        await redis.set(scoreKey, '0', { ex: 7200 });
        
        // Verify immediately
        const verification = await redis.get(scoreKey);
        console.log(`[SCORES] ✅ Verification ${scoreKey}: ${verification}`);
        
        results[cleanName] = 0;
      }
    }
    
    console.log('[SCORES] 🎯 Final initialized scores:', results);
    return results;
    
  } catch (error) {
    console.error('[SCORES] ❌ Error initializing scores:', error);
    throw error;
  }
},
};

export const VotesRedis = {
  // Submit vote - AVEC KEYS SÉPARÉES
  async submitVote(round, playerName, answer) {
    // Use separate Redis keys instead of corrupted hashes
    const voteKey = `vote:r${round}:player:${playerName}`;
    const countKey = `vote:r${round}:count`;
    
    // Check if player already voted
    const existingVote = await redis.get(voteKey);
    if (existingVote) {
      throw new Error('Player already voted this round');
    }

    console.log(`[VOTES] Submitting vote: ${playerName} -> ${answer} for round ${round}`);

    try {
      // Store vote and increment count with separate keys
      await redis.set(voteKey, answer, { ex: 1800 }); // 30min expiry
      console.log(`[VOTES] ✅ Vote stored: ${playerName} -> ${answer}`);
      
      const newCount = await redis.incr(countKey);
      await redis.expire(countKey, 1800); // 30min expiry
      console.log(`[VOTES] ✅ Vote count incremented to: ${newCount}`);
      
      console.log(`[VOTES] Vote submission completed successfully. Final count: ${newCount}`);
      
      return { votesCount: newCount, answer };
      
    } catch (error) {
      console.error(`[VOTES] ❌ Error submitting vote:`, error);
      throw error;
    }
  },

  // Get votes for a round - AVEC KEYS SÉPARÉES
  async getRoundVotes(round) {
    try {
      console.log(`[VOTES] 🔧 Getting votes with SEPARATE KEYS for round ${round}`);
      
      // Get vote count
      const countKey = `vote:r${round}:count`;
      const totalKey = `vote:r${round}:total`;
      
      const [votesCountStr, totalPlayersStr] = await Promise.all([
        redis.get(countKey),
        redis.get(totalKey)
      ]);
      
      const votesCount = parseInt(votesCountStr) || 0;
      const totalPlayers = parseInt(totalPlayersStr) || 0;
      
      console.log(`[VOTES] 📊 Count=${votesCount}, Total=${totalPlayers}`);
      
      // Get all vote keys for this round using pattern matching
      const votePattern = `vote:r${round}:player:*`;
      const voteKeys = await redis.keys(votePattern);
      
      console.log(`[VOTES] 🔑 Found vote keys:`, voteKeys);
      
      const votes = {};
      
      // Get each vote
      if (voteKeys && voteKeys.length > 0) {
        const voteValues = await redis.mget(...voteKeys);
        
        voteKeys.forEach((key, index) => {
          // Extract player name from key: vote:r1:player:jeremy -> jeremy
          const keyParts = key.split(':');
          if (keyParts.length >= 4 && keyParts[0] === 'vote' && keyParts[2] === 'player') {
            const playerName = keyParts.slice(3).join(':'); // Handle names with colons
            const vote = voteValues[index];
            if (vote) {
              votes[playerName] = vote;
              console.log(`[VOTES] ✅ Got vote: ${playerName} -> ${vote}`);
            }
          }
        });
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
    
    try {
      // Get all keys for this round
      const pattern = `vote:r${round}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys && keys.length > 0) {
        await redis.del(...keys);
        console.log(`[VOTES] ✅ Deleted ${keys.length} keys for round ${round}`);
      }
    } catch (error) {
      console.error(`[VOTES] ❌ Error clearing round ${round}:`, error);
    }
  },

  // Set total players for vote counting
  async setTotalPlayers(round, totalPlayers) {
    const totalKey = `vote:r${round}:total`;
    console.log(`[VOTES] 👥 Setting total players for round ${round}: ${totalPlayers}`);
    await redis.set(totalKey, totalPlayers.toString(), { ex: 1800 });
  },

  // FORCE cleanup all vote data
  async forceCleanupAllVotes() {
    console.log(`[VOTES] 🧨 FORCE CLEANUP: Deleting ALL vote keys...`);
    
    try {
      // Get all vote keys
      const allVoteKeys = await redis.keys('vote:*');
      console.log(`[VOTES] Found ${allVoteKeys.length} vote keys to delete`);
      
      if (allVoteKeys.length > 0) {
        await redis.del(...allVoteKeys);
        console.log(`[VOTES] ✅ Deleted ${allVoteKeys.length} vote keys`);
      }
      
      return { success: true, deletedKeys: allVoteKeys.length };
    } catch (error) {
      console.error(`[VOTES] ❌ Error in force cleanup:`, error);
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