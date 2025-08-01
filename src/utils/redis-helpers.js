// 🛡️ HELPERS REDIS ULTRA-ROBUSTES - Plus jamais de crash !
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 🔒 HELPER 1: Sérialisation ultra-sûre
export const RedisSerializer = {
  /**
   * Sérialise une valeur pour Redis de manière ultra-sûre
   */
  serialize(value, fieldName = 'unknown') {
    try {
      // Cas spéciaux
      if (value === null || value === undefined) {
        return null;
      }
      
      if (typeof value === 'string') {
        return value;
      }
      
      if (typeof value === 'number' || typeof value === 'boolean') {
        return value.toString();
      }
      
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

  /**
   * Désérialise une valeur de Redis de manière ultra-sûre
   */
  deserialize(value, fieldName = 'unknown', fallback = null) {
    try {
      // Cas null/undefined
      if (value === null || value === undefined || value === 'null' || value === 'undefined') {
        return fallback;
      }

      // Si c'est déjà un objet (cas Upstash bizarre)
      if (typeof value === 'object' && value !== null) {
        console.warn(`[REDIS-SAFE] ⚠️ Got object instead of string for ${fieldName}, using as-is`);
        return value;
      }

      // Si c'est une string, essayer de parser
      if (typeof value === 'string') {
        // Vérifier si c'est du JSON (commence par { ou [)
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
        
        // Pas du JSON, retourner la string
        return value;
      }

      // Autres types, retourner tel quel
      return value;
      
    } catch (error) {
      console.error(`[REDIS-SAFE] ❌ Deserialization error for ${fieldName}:`, error);
      return fallback;
    }
  }
};

// 🔒 HELPER 2: Opérations Redis ultra-sûres
export const SafeRedisOps = {
  /**
   * Set une valeur avec sérialisation automatique
   */
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

  /**
   * Get une valeur avec désérialisation automatique
   */
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

  /**
   * Get multiple avec gestion d'erreur
   */
  async safeMultiGet(keys, fieldNames = null) {
    try {
      if (!keys || keys.length === 0) {
        return {};
      }

      const values = await redis.mget(...keys);
      const result = {};

      keys.forEach((key, index) => {
        const fieldName = fieldNames ? fieldNames[index] : key;
        result[key] = RedisSerializer.deserialize(values[index], fieldName, null);
      });

      console.log(`[REDIS-SAFE] ✅ Multi-get completed for ${keys.length} keys`);
      return result;
    } catch (error) {
      console.error('[REDIS-SAFE] ❌ Multi-get failed:', error);
      return {};
    }
  },

  /**
   * Pipeline operations avec gestion d'erreur
   */
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

// 🔒 HELPER 3: Validation des données
export const RedisValidator = {
  /**
   * Vérifie l'intégrité des données du jeu
   */
  validateGameState(gameState) {
    const issues = [];

    if (!gameState.gameId) {
      issues.push('Missing gameId');
    }

    if (!['waiting', 'preloading', 'playing', 'finished'].includes(gameState.gameMode)) {
      issues.push(`Invalid gameMode: ${gameState.gameMode}`);
    }

    if (gameState.currentRound < 0) {
      issues.push(`Invalid currentRound: ${gameState.currentRound}`);
    }

    if (gameState.totalPhotos < 0) {
      issues.push(`Invalid totalPhotos: ${gameState.totalPhotos}`);
    }

    if (issues.length > 0) {
      console.warn('[REDIS-VALIDATOR] ⚠️ Game state issues:', issues);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  },

  /**
   * Nettoie les données corrompues
   */
  sanitizeGameState(gameState) {
    const sanitized = {
      gameId: gameState.gameId || null,
      gameMode: ['waiting', 'preloading', 'playing', 'finished'].includes(gameState.gameMode) 
        ? gameState.gameMode : 'waiting',
      currentRound: Math.max(0, parseInt(gameState.currentRound) || 0),
      totalPhotos: Math.max(0, parseInt(gameState.totalPhotos) || 0),
      currentPhoto: gameState.currentPhoto || null,
      selectedPhotos: Array.isArray(gameState.selectedPhotos) ? gameState.selectedPhotos : [],
      settings: gameState.settings && typeof gameState.settings === 'object' 
        ? gameState.settings : { timePerPhoto: 10 },
      startTime: gameState.startTime || null,
      roundStartTime: gameState.roundStartTime || null,
      winner: gameState.winner || null,
      endedAt: gameState.endedAt || null,
      preloadingPlayers: gameState.preloadingPlayers && typeof gameState.preloadingPlayers === 'object'
        ? gameState.preloadingPlayers : {}
    };

    console.log('[REDIS-VALIDATOR] ✅ Game state sanitized');
    return sanitized;
  }
};

// 🔒 HELPER 4: Recovery et Cleanup
export const RedisRecovery = {
  /**
   * Recovery automatique en cas d'erreur
   */
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
        
        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    console.error(`[REDIS-RECOVERY] ❌ All ${maxRetries} attempts failed`);
    throw lastError;
  },

  /**
   * Cleanup des données corrompues
   */
  async cleanupCorruptedData() {
    try {
      console.log('[REDIS-RECOVERY] 🧹 Starting cleanup...');
      
      // Get all game-related keys
      const gameKeys = await redis.keys('game:*');
      const voteKeys = await redis.keys('vote:*');
      const scoreKeys = await redis.keys('score:*');
      
      const allKeys = [...gameKeys, ...voteKeys, ...scoreKeys];
      
      if (allKeys.length === 0) {
        console.log('[REDIS-RECOVERY] ✅ No keys to cleanup');
        return { cleaned: 0, errors: 0 };
      }

      let cleaned = 0;
      let errors = 0;

      // Test each key
      for (const key of allKeys) {
        try {
          const value = await redis.get(key);
          
          // Try to validate/deserialize
          if (typeof value === 'string' && value.trim().startsWith('{')) {
            JSON.parse(value); // Will throw if corrupted JSON
          }
          
        } catch (error) {
          console.warn(`[REDIS-RECOVERY] 🗑️ Removing corrupted key: ${key}`);
          await redis.del(key);
          cleaned++;
        }
      }

      console.log(`[REDIS-RECOVERY] ✅ Cleanup complete: ${cleaned} keys cleaned, ${errors} errors`);
      return { cleaned, errors };
      
    } catch (error) {
      console.error('[REDIS-RECOVERY] ❌ Cleanup failed:', error);
      throw error;
    }
  }
};

export default {
  RedisSerializer,
  SafeRedisOps,
  RedisValidator,
  RedisRecovery
};