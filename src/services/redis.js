// 🛡️ REDIS SERVICE ULTRA-ROBUSTE - Version corrigée
import { Redis } from '@upstash/redis';
import { SafeRedisOps, RedisValidator, RedisRecovery } from './redis-helpers.js';
import { DEFAULT_TIME_PER_ROUND } from '../constants.js';

// Initialize Redis client
const redis = Redis.fromEnv();

// 🔒 GAME STATE MANAGEMENT - VERSION ULTRA-ROBUSTE
export const GameStateRedis = {
  // Get current game state - AVEC RECOVERY AUTOMATIQUE
  async getCurrentGame() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 🔍 Getting current game state...');
        
        // Utiliser les helpers sûrs au lieu de Promise.all dangereux
        const gameData = {};
        
        // Get each field safely
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

        // Get all values safely
        for (const [redisKey, fieldName] of Object.entries(fieldMap)) {
          try {
            gameData[fieldName] = await SafeRedisOps.safeGet(redisKey);
          } catch (error) {
            console.warn(`[REDIS-SAFE] ⚠️ Failed to get ${redisKey}, using default`);
            gameData[fieldName] = null;
          }
        }

        // Transform et valide les données
        const gameState = {
          gameId: gameData.gameId || null,
          gameMode: gameData.gameMode || 'waiting',
          currentRound: parseInt(gameData.currentRound) || 0,
          currentPhoto: gameData.currentPhoto, // Déjà désérialisé par helper
          totalPhotos: parseInt(gameData.totalPhotos) || 0,
          startTime: gameData.startTime || null,
          selectedPhotos: gameData.selectedPhotos || [], // Déjà désérialisé
          settings: gameData.settings || { timePerPhoto: DEFAULT_TIME_PER_ROUND },
          roundStartTime: gameData.roundStartTime || null,
          winner: gameData.winner || null,
          endedAt: gameData.endedAt || null,
          preloadingPlayers: gameData.preloadingPlayers || {}
        };

        // Validation et nettoyage
        const validation = RedisValidator.validateGameState(gameState);
        const finalState = validation.isValid ? gameState : RedisValidator.sanitizeGameState(gameState);

        console.log('[REDIS-SAFE] ✅ Game state retrieved and validated:', {
          ...finalState,
          selectedPhotos: `${finalState.selectedPhotos.length} photos`,
          currentPhoto: finalState.currentPhoto ? 'present' : 'null'
        });

        return finalState;
        
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error getting game state:', error);
        // Return safe defaults instead of crashing
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

  // Set game state - AVEC PIPELINE SÉCURISÉ
  async setCurrentGame(gameState) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 💾 Setting game state...');
        
        // Prepare pipeline operations
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

        // Build operations safely
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

        // Execute pipeline safely
        await SafeRedisOps.safePipeline(operations);
        
        console.log('[REDIS-SAFE] ✅ Game state set successfully');
        return gameState;
        
      } catch (error) {
        console.error('[REDIS-SAFE] ❌ Error setting game state:', error);
        throw error;
      }
    });
  },

  // Update specific field - ULTRA-SÛR
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

        // Use safe set operation
        await SafeRedisOps.safeSet(redisKey, value);
        
        console.log(`[REDIS-SAFE] ✅ Updated ${field} successfully`);
        return value;
        
      } catch (error) {
        console.error(`[REDIS-SAFE] ❌ Error updating field ${field}:`, error);
        throw error;
      }
    });
  },

  // Reset game - AVEC CLEANUP AUTOMATIQUE
  async resetGame() {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        console.log('[REDIS-SAFE] 🧹 Resetting game...');
        
        // First, try automatic cleanup of corrupted data
        await RedisRecovery.cleanupCorruptedData();
        
        // Then proceed with normal reset
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

        // Delete vote data safely
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

// 🔒 PLAYERS MANAGEMENT - VERSION ROBUSTE
export const PlayersRedis = {
  // Get all players - AVEC VALIDATION
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

            // Validate player structure
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

  // Add player - AVEC VALIDATION
  async addPlayer(player) {
    return RedisRecovery.attemptRecovery(async () => {
      try {
        // Validate input
        if (!player || !player.name || typeof player.name !== 'string') {
          throw new Error('Invalid player data');
        }

        const playerData = {
          ...player,
          joinedAt: new Date().toISOString(),
          lastSeen: Date.now()
        };
        
        // Check if player already exists
        const players = await this.getPlayers();
        const exists = players.find(p => p && p.name === player.name);
        if (exists) {
          throw new Error('Player name already taken');
        }

        // Store as JSON string safely
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

  // Remove player - SÉCURISÉ
  async removePlayer(playerName) {
    return RedisRecovery.attemptRecovery(async () => {
      const players = await this.getPlayers();
      const filteredPlayers = players.filter(p => p.name !== playerName);
      
      await redis.del('game:players');
      if (filteredPlayers.length > 0) {
        const operations = filteredPlayers.map(player => ({
          command: 'set',
          key: 'temp_player_' + Date.now(),
          value: JSON.stringify(player)
        }));

        // Rebuild player list safely
        for (const player of filteredPlayers) {
          await redis.lpush('game:players', JSON.stringify(player));
        }
        await redis.expire('game:players', 7200);
      }
      return filteredPlayers;
    });
  },

  // Clear all players
  async clearAllPlayers() {
    return RedisRecovery.attemptRecovery(async () => {
      await redis.del('game:players');
      return { success: true, message: 'All players cleared' };
    });
  },

  // Update heartbeat - SÉCURISÉ
  async updateHeartbeat(playerName) {
    try {
      await redis.hset('players:online', playerName, Date.now());
      await redis.expire('players:online', 60);
    } catch (error) {
      console.warn('[REDIS-SAFE] ⚠️ Heartbeat update failed:', error.message);
      // Don't throw - heartbeat is not critical
    }
  },

  // Get online players - SÉCURISÉ
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

// Export the rest of your services with similar safety improvements...
// (ScoresRedis, VotesRedis, etc. would follow the same pattern)

export default redis;