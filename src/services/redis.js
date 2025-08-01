// 🛡️ REDIS SERVICE ULTRA-ROBUSTE - Version COMPLÈTE avec TOUS les exports
import { Redis } from '@upstash/redis';
import { DEFAULT_TIME_PER_ROUND } from '../constants.js';

// 🛡️ HELPERS INTÉGRÉS (pour éviter les problèmes d'import)
const RedisSerializer = {
  serialize(value, fieldName = 'unknown') {
    try {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
      if (typeof value === 'object') {
        const jsonString = JSON.stringify(value);
        console.log(`[REDIS-SAFE] ✅ Serialized ${fieldName}:`, jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : ''));
        return jsonString;
      }
      return value.toString();
    } catch (error) {
      console.error(`[REDIS-SAFE] ❌ Serialization error for ${fieldName}:`, error);
      throw new Error(`Failed to serialize ${fieldName}: ${error.message}`);
    }
  },

  deserialize(value, fieldName = 'unknown', fallback = null) {
    try {
      if (value === null || value === undefined || value === 'null' || value === 'undefined') {
        return fallback;
      }

      if (typeof value === 'object' && value !== null) {
        console.warn(`[REDIS-SAFE] ⚠️ Got object instead of string for ${fieldName}, using as-is`);
        return value;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const parsed = JSON.parse(trimmed);
            console.log(`[REDIS-SAFE] ✅ Parsed JSON for ${fieldName}`);
            return parsed;
          } catch (parseError) {
            console.warn(`[REDIS-SAFE] ⚠️ JSON parse failed for ${fieldName}, returning as string:`, parseError.message);
            return value;
          }
        }
        return value;
      }

      return value;
    } catch (error) {
      console.error(`[REDIS-SAFE] ❌ Deserialization error for ${fieldName}:`, error);
      return fallback;
    }
  }
};

const SafeRedisOps = {
  async safeSet(key, value, options = { ex: 7200 }) {
    try {
      const serialized = RedisSerializer.serialize(value, key);
      await redis.set(key, serialized, options);
      console.log(`[REDIS-SAFE] ✅ Set ${key} = ${typeof serialized === 'string' && serialized.length > 50 ? serialized.substring(0, 50) + '...' : serialized}`);
      return true;
    } catch (error) {
      console.error(`[REDIS-SAFE] ❌ Failed to set ${key}:`, error);
      throw error;
    }
  },

  async safeGet(key, fallback = null) {
    try {
      const value = await redis.get(key);
      const deserialized = RedisSerializer.deserialize(value, key, fallback);
      console.log(`[REDIS-SAFE] ✅ Get ${key} = ${typeof deserialized === 'object' ? 'object' : deserialized}`);
      return deserialized;
    } catch (error) {
      console.error(`[REDIS-SAFE] ❌ Failed to get ${key}:`, error);
      return fallback;
    }
  },

  async safePipeline(operations) {
    try {
      const pipeline = redis.pipeline();
      
      operations.forEach(op => {
        if (op.command === 'set') {
          const serialized = RedisSerializer.serialize(op.value, op.key);
          pipeline.set(op.key, serialized, op.options || { ex: 7200 });
        } else if (op.command === 'del') {
          pipeline.del(op.key);
        }
      });

      const results = await pipeline.exec();
      console.log(`[REDIS-SAFE] ✅ Pipeline completed with ${operations.length} operations`);
      return results;
    } catch (error) {
      console.error('[REDIS-SAFE] ❌ Pipeline failed:', error);
      throw error;
    }
  }
};

const RedisRecovery = {
  async attemptRecovery(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[REDIS-RECOVERY] 🔄 Attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        console.log(`[REDIS-RECOVERY] ✅ Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[REDIS-RECOVERY] ⚠️ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    console.error(`[REDIS-RECOVERY] ❌ All ${maxRetries} attempts failed`);
    throw lastError;
  },

  async cleanupCorruptedData() {
    try {
      console.log('[REDIS-RECOVERY] 🧹 Starting cleanup...');
      
      const gameKeys = await redis.keys('game:*');
      const voteKeys = await redis.keys('vote:*');
      const scoreKeys = await redis.keys('score:*');
      
      const allKeys = [...gameKeys, ...voteKeys, ...scoreKeys];
      
      if (allKeys.length === 0) {
        console.log('[REDIS-RECOVERY] ✅ No keys to cleanup');
        return { cleaned: 0, errors: 0 };
      }

      let cleaned = 0;

      for (const key of allKeys) {
        try {
          const value = await redis.get(key);
          if (typeof value === 'string' && value.trim().startsWith('{')) {
            JSON.parse(value);
          }
        } catch (error) {
          console.warn(`[REDIS-RECOVERY] 🗑️ Removing corrupted key: ${key}`);
          await redis.del(key);
          cleaned++;
        }
      }

      console.log(`[REDIS-RECOVERY] ✅ Cleanup complete: ${cleaned} keys cleaned`);
      return { cleaned, errors: 0 };
    } catch (error) {
      console.error('[REDIS-RECOVERY] ❌ Cleanup failed:', error);
      throw error;
    }
  }
};

// Initialize Redis client
const redis = Redis.fromEnv();

// 🔒 GAME STATE MANAGEMENT - ULTRA-ROBUSTE
export const GameStateRedis = {
  async getCurrentGame() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 🔍 Getting current game state...');
        
        const gameData = {};
        const fieldMap = {
          'game:id': 'gameId',
          'game:mode': 'gameMode',
          'game:round': 'currentRound',
          'game:photo': 'currentPhoto',
          'game:total': 'totalPhotos',
          'game:start': 'startTime',
          'game:photos': 'selectedPhotos',
          'game:settings': 'settings',
          'game:roundstart': 'roundStartTime',
          'game:winner': 'winner',
          'game:ended': 'endedAt',
          'game:preloading': 'preloadingPlayers'
        };

        for (const [redisKey, fieldName] of Object.entries(fieldMap)) {
          try {
            gameData[fieldName] = await SafeRedisOps.safeGet(redisKey);
          } catch (error) {
            console.warn(`[REDIS-SAFE] ⚠️ Failed to get ${redisKey}, using default`);
            gameData[fieldName] = null;
          }
        }

        const gameState = {
          gameId: gameData.gameId || null,
          gameMode: gameData.gameMode || 'waiting',
          currentRound: parseInt(gameData.currentRound) || 0,
          currentPhoto: gameData.currentPhoto,
          totalPhotos: parseInt(gameData.totalPhotos) || 0,
          startTime: gameData.startTime || null,
          selectedPhotos: gameData.selectedPhotos || [],
          settings: gameData.settings || { timePerPhoto: DEFAULT_TIME_PER_ROUND },
          roundStartTime: gameData.roundStartTime || null,
          winner: gameData.winner || null,
          endedAt: gameData.endedAt || null,
          preloadingPlayers: gameData.preloadingPlayers || {}
        };

        console.log('[REDIS-SAFE] ✅ Game state retrieved:', {
          ...gameState,
          selectedPhotos: `${gameState.selectedPhotos.length} photos`,
          currentPhoto: gameState.currentPhoto ? 'present' : 'null'
        });

        return gameState;
        
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error getting game state:', error);
        return {
          gameId: null,
          gameMode: 'waiting',
          currentRound: 0,
          currentPhoto: null,
          totalPhotos: 0,
          startTime: null,
          selectedPhotos: [],
          settings: { timePerPhoto: DEFAULT_TIME_PER_ROUND },
          roundStartTime: null,
          winner: null,
          endedAt: null,
          preloadingPlayers: {}
        };
      }
    });
  },

  async setCurrentGame(gameState) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 💾 Setting game state...');
        
        const operations = [];
        const fieldMap = {
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
          endedAt: 'game:ended',
          preloadingPlayers: 'game:preloading'
        };

        for (const [field, redisKey] of Object.entries(fieldMap)) {
          if (gameState[field] !== undefined) {
            operations.push({
              command: 'set',
              key: redisKey,
              value: gameState[field],
              options: { ex: 7200 }
            });
          }
        }

        await SafeRedisOps.safePipeline(operations);
        
        console.log('[REDIS-SAFE] ✅ Game state set successfully');
        return gameState;
        
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error setting game state:', error);
        throw error;
      }
    });
  },

  async updateGameField(field, value) {
    return RedisRecovery.attemptRecovery(async () => {
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
          endedAt: 'game:ended',
          preloadingPlayers: 'game:preloading'
        };

        const redisKey = keyMap[field];
        if (!redisKey) {
          throw new Error(`Unknown field: ${field}`);
        }

        await SafeRedisOps.safeSet(redisKey, value);
        
        console.log(`[REDIS-SAFE] ✅ Updated ${field} successfully`);
        return value;
        
      } catch (error) {
        console.error(`[REDIS-SAFE] ❌ Error updating field ${field}:`, error);
        throw error;
      }
    });
  },

  async resetGame() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 🧹 Resetting game...');
        
        await RedisRecovery.cleanupCorruptedData();
        
        const keysToDelete = [
          'game:id', 'game:mode', 'game:round', 'game:photo', 'game:total',
          'game:start', 'game:photos', 'game:settings', 'game:roundstart',
          'game:winner', 'game:ended', 'game:preloading',
          'game:players', 'game:scores'
        ];

        const operations = keysToDelete.map(key => ({
          command: 'del',
          key
        }));

        try {
          const voteKeys = await redis.keys('vote:*');
          if (voteKeys && voteKeys.length > 0) {
            voteKeys.forEach(key => operations.push({ command: 'del', key }));
          }
        } catch (error) {
          console.warn('[REDIS-SAFE] ⚠️ Could not get vote keys, skipping');
        }

        await SafeRedisOps.safePipeline(operations);
        
        console.log('[REDIS-SAFE] ✅ Game reset completed');
        return { success: true };
        
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error resetting game:', error);
        throw error;
      }
    });
  }
};

// 🔒 PLAYERS MANAGEMENT - ULTRA-ROBUSTE
export const PlayersRedis = {
  async getPlayers() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        const players = await redis.lrange('game:players', 0, -1);
        if (!players || players.length === 0) {
          return [];
        }
        
        const validPlayers = [];
        for (const playerData of players) {
          try {
            let player;
            if (typeof playerData === 'string') {
              player = JSON.parse(playerData);
            } else if (typeof playerData === 'object' && playerData !== null) {
              player = playerData;
            } else {
              console.warn('[REDIS-SAFE] ⚠️ Invalid player data type:', typeof playerData);
              continue;
            }

            if (player && player.name && typeof player.name === 'string') {
              validPlayers.push(player);
            } else {
              console.warn('[REDIS-SAFE] ⚠️ Invalid player structure:', player);
            }
          } catch (parseError) {
            console.warn('[REDIS-SAFE] ⚠️ Skipping corrupted player data:', parseError.message);
          }
        }
        
        console.log(`[REDIS-SAFE] ✅ Retrieved ${validPlayers.length} valid players`);
        return validPlayers;
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error getting players:', error);
        return [];
      }
    });
  },

  async addPlayer(player) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        if (!player || !player.name || typeof player.name !== 'string') {
          throw new Error('Invalid player data');
        }

        const playerData = {
          ...player,
          joinedAt: new Date().toISOString(),
          lastSeen: Date.now()
        };
        
        const players = await this.getPlayers();
        const exists = players.find(p => p && p.name === player.name);
        if (exists) {
          throw new Error('Player name already taken');
        }

        const playerJson = JSON.stringify(playerData);
        await redis.lpush('game:players', playerJson);
        await redis.expire('game:players', 7200);
        
        console.log('[REDIS-SAFE] ✅ Player added successfully');
        return playerData;
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error adding player:', error);
        throw error;
      }
    });
  },

  async removePlayer(playerName) {
    return RedisRecovery.attemptRecovery(async () => {
      const players = await this.getPlayers();
      const filteredPlayers = players.filter(p => p.name !== playerName);
      
      await redis.del('game:players');
      if (filteredPlayers.length > 0) {
        for (const player of filteredPlayers) {
          await redis.lpush('game:players', JSON.stringify(player));
        }
        await redis.expire('game:players', 7200);
      }
      return filteredPlayers;
    });
  },

  async clearAllPlayers() {
    return RedisRecovery.attemptRecovery(async () => {
      await redis.del('game:players');
      return { success: true, message: 'All players cleared' };
    });
  },

  async updateHeartbeat(playerName) {
    try {
      await redis.hset('players:online', playerName, Date.now());
      await redis.expire('players:online', 60);
    } catch (error) {
      console.warn('[REDIS-SAFE] ⚠️ Heartbeat update failed:', error.message);
    }
  },

  async getOnlinePlayers() {
    try {
      const online = await redis.hgetall('players:online') || {};
      const now = Date.now();
      const activePlayers = {};
      
      Object.entries(online).forEach(([name, lastSeen]) => {
        if (now - parseInt(lastSeen) < 30000) {
          activePlayers[name] = lastSeen;
        }
      });
      
      return activePlayers;
    } catch (error) {
      console.warn('[REDIS-SAFE] ⚠️ Failed to get online players:', error.message);
      return {};
    }
  }
};

// 🔒 SCORES MANAGEMENT - ULTRA-ROBUSTE
export const ScoresRedis = {
  async getScores() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        const scoreKeys = await redis.keys('score:*');
        const scores = {};
        
        if (scoreKeys.length === 0) {
          return {};
        }
        
        const values = await redis.mget(...scoreKeys);
        
        scoreKeys.forEach((key, index) => {
          const playerName = key.replace('score:', '');
          scores[playerName] = parseInt(values[index]) || 0;
        });
        
        console.log('[SCORES] 📊 Retrieved scores:', scores);
        return scores;
      } catch (error) {
        console.error('[SCORES] ❌ Error getting scores:', error);
        return {};
      }
    });
  },

  async setScore(playerName, score) {
    return RedisRecovery.attemptRecovery(async () => {
      const scoreKey = `score:${playerName}`;
      await redis.set(scoreKey, score.toString(), { ex: 7200 });
      console.log(`[SCORES] 🎯 Set ${scoreKey} = ${score}`);
      return score;
    });
  },

  async incrementScore(playerName, points = 1) {
    return RedisRecovery.attemptRecovery(async () => {
      const scoreKey = `score:${playerName}`;
      const currentScore = await redis.get(scoreKey);
      const newScore = (parseInt(currentScore) || 0) + points;
      await redis.set(scoreKey, newScore.toString(), { ex: 7200 });
      console.log(`[SCORES] 📈 Incremented ${scoreKey}: ${currentScore} + ${points} = ${newScore}`);
      return newScore;
    });
  },

  async resetScores() {
    return RedisRecovery.attemptRecovery(async () => {
      const scoreKeys = await redis.keys('score:*');
      if (scoreKeys.length > 0) {
        await redis.del(...scoreKeys);
        console.log('[SCORES] 🧹 Deleted score keys:', scoreKeys);
      }
      return {};
    });
  },

  async initializeScores(playerNames) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[SCORES] 🚀 Initializing scores for:', playerNames);
        
        const existingKeys = await redis.keys('score:*');
        if (existingKeys.length > 0) {
          await redis.del(...existingKeys);
          console.log('[SCORES] 🧹 Cleared existing score keys:', existingKeys);
        }
        
        if (!playerNames || playerNames.length === 0) {
          return {};
        }
        
        const results = {};
        for (const name of playerNames) {
          if (name && typeof name === 'string' && name.trim().length > 0) {
            const cleanName = name.trim();
            const scoreKey = `score:${cleanName}`;
            
            console.log(`[SCORES] 🎯 Setting individual key: ${scoreKey} = 0`);
            await redis.set(scoreKey, '0', { ex: 7200 });
            
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
    });
  }
};

// 🔒 VOTES MANAGEMENT - ULTRA-ROBUSTE
export const VotesRedis = {
  async submitVote(round, playerName, answer) {
    return RedisRecovery.attemptRecovery(async () => {
      const voteKey = `vote:r${round}:player:${playerName}`;
      const countKey = `vote:r${round}:count`;
      
      const existingVote = await redis.get(voteKey);
      if (existingVote) {
        throw new Error('Player already voted this round');
      }

      console.log(`[VOTES] Submitting vote: ${playerName} -> ${answer} for round ${round}`);

      try {
        await redis.set(voteKey, answer, { ex: 1800 });
        console.log(`[VOTES] ✅ Vote stored: ${playerName} -> ${answer}`);
        
        const newCount = await redis.incr(countKey);
        await redis.expire(countKey, 1800);
        console.log(`[VOTES] ✅ Vote count incremented to: ${newCount}`);
        
        return { votesCount: newCount, answer };
        
      } catch (error) {
        console.error(`[VOTES] ❌ Error submitting vote:`, error);
        throw error;
      }
    });
  },

  async getRoundVotes(round) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log(`[VOTES] 🔧 Getting votes for round ${round}`);
        
        const countKey = `vote:r${round}:count`;
        const totalKey = `vote:r${round}:total`;
        
        const [votesCountStr, totalPlayersStr] = await Promise.all([
          redis.get(countKey),
          redis.get(totalKey)
        ]);
        
        const votesCount = parseInt(votesCountStr) || 0;
        const totalPlayers = parseInt(totalPlayersStr) || 0;
        
        console.log(`[VOTES] 📊 Count=${votesCount}, Total=${totalPlayers}`);
        
        const votePattern = `vote:r${round}:player:*`;
        const voteKeys = await redis.keys(votePattern);
        
        console.log(`[VOTES] 🔑 Found vote keys:`, voteKeys);
        
        const votes = {};
        
        if (voteKeys && voteKeys.length > 0) {
          const voteValues = await redis.mget(...voteKeys);
          
          voteKeys.forEach((key, index) => {
            const keyParts = key.split(':');
            if (keyParts.length >= 4 && keyParts[0] === 'vote' && keyParts[2] === 'player') {
              const playerName = keyParts.slice(3).join(':');
              const vote = voteValues[index];
              if (vote) {
                votes[playerName] = vote;
                console.log(`[VOTES] ✅ Got vote: ${playerName} -> ${vote}`);
              }
            }
          });
        }
        
        console.log(`[VOTES] ✅ Final votes for round ${round}:`, { 
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
    });
  },

  async clearRoundVotes(round) {
    return RedisRecovery.attemptRecovery(async () => {
      console.log(`[VOTES] 🧹 Clearing votes for round ${round}`);
      
      try {
        const pattern = `vote:r${round}:*`;
        const keys = await redis.keys(pattern);
        
        if (keys && keys.length > 0) {
          await redis.del(...keys);
          console.log(`[VOTES] ✅ Deleted ${keys.length} keys for round ${round}`);
        }
      } catch (error) {
        console.error(`[VOTES] ❌ Error clearing round ${round}:`, error);
      }
    });
  },

  async setTotalPlayers(round, totalPlayers) {
    return RedisRecovery.attemptRecovery(async () => {
      const totalKey = `vote:r${round}:total`;
      console.log(`[VOTES] 👥 Setting total players for round ${round}: ${totalPlayers}`);
      await redis.set(totalKey, totalPlayers.toString(), { ex: 1800 });
    });
  },

  async forceCleanupAllVotes() {
    return RedisRecovery.attemptRecovery(async () => {
      console.log(`[VOTES] 🧨 FORCE CLEANUP: Deleting ALL vote keys...`);
      
      try {
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
    });
  }
};

// 🔒 EVENTS MANAGEMENT - ULTRA-ROBUSTE
export const EventsRedis = {
  async publish(channel, event, data) {
    return RedisRecovery.attemptRecovery(async () => {
      const message = JSON.stringify({ event, data, timestamp: Date.now() });
      await redis.publish(channel, message);
    });
  },

  async subscribe(channel, callback) {
    console.log('Redis pub/sub setup for server-side events');
  }
};

// 🔒 HEALTH CHECK - ULTRA-ROBUSTE
export const RedisHealth = {
  async ping() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        const result = await redis.ping();
        return { status: 'healthy', result, timestamp: Date.now() };
      } catch (error) {
        return { status: 'error', error: error.message, timestamp: Date.now() };
      }
    });
  },

  async getInfo() {
    return RedisRecovery.attemptRecovery(async () => {
      const info = await redis.info();
      return info;
    });
  }
};

// Export default Redis client for custom operations
export default redis;