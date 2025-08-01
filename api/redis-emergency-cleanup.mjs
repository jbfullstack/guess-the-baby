// 🚨 ENDPOINT D'URGENCE - redis-emergency-cleanup.mjs
import { RedisRecovery } from '../src/services/redis-helpers.js';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // Allow both GET and POST for emergency access
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    console.log('🚨 EMERGENCY CLEANUP INITIATED');

    const cleanupReport = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: [],
      recovered: 0,
      cleaned: 0
    };

    // 1. Test Redis connection
    try {
      await redis.ping();
      cleanupReport.actions.push('✅ Redis connection OK');
    } catch (error) {
      cleanupReport.errors.push(`❌ Redis connection failed: ${error.message}`);
      return res.json({
        success: false,
        error: 'Redis connection failed',
        report: cleanupReport,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // 2. Cleanup corrupted data
    try {
      const cleanupResult = await RedisRecovery.cleanupCorruptedData();
      cleanupReport.cleaned = cleanupResult.cleaned;
      cleanupReport.actions.push(`🧹 Cleaned ${cleanupResult.cleaned} corrupted keys`);
    } catch (error) {
      cleanupReport.errors.push(`❌ Cleanup failed: ${error.message}`);
    }

    // 3. Validate remaining data
    try {
      const gameKeys = await redis.keys('game:*');
      const scoreKeys = await redis.keys('score:*');
      const voteKeys = await redis.keys('vote:*');
      
      cleanupReport.actions.push(`📊 Found ${gameKeys.length} game keys, ${scoreKeys.length} score keys, ${voteKeys.length} vote keys`);

      // Test each remaining key
      let validKeys = 0;
      let invalidKeys = 0;

      for (const key of [...gameKeys, ...scoreKeys, ...voteKeys]) {
        try {
          const value = await redis.get(key);
          if (value !== null) {
            validKeys++;
          }
        } catch (error) {
          invalidKeys++;
          cleanupReport.errors.push(`❌ Invalid key ${key}: ${error.message}`);
          // Try to delete invalid key
          try {
            await redis.del(key);
            cleanupReport.actions.push(`🗑️ Deleted invalid key: ${key}`);
          } catch (delError) {
            cleanupReport.errors.push(`❌ Failed to delete ${key}: ${delError.message}`);
          }
        }
      }

      cleanupReport.actions.push(`✅ Validated ${validKeys} keys, removed ${invalidKeys} invalid keys`);

    } catch (error) {
      cleanupReport.errors.push(`❌ Validation failed: ${error.message}`);
    }

    // 4. Emergency reset if requested
    if (req.query.reset === 'true' || req.body?.reset === true) {
      try {
        cleanupReport.actions.push('🚨 EMERGENCY RESET REQUESTED');
        
        const allKeys = await redis.keys('game:*', 'score:*', 'vote:*', 'players:*');
        if (allKeys.length > 0) {
          await redis.del(...allKeys);
          cleanupReport.actions.push(`💥 Emergency reset: deleted ${allKeys.length} keys`);
        }
      } catch (error) {
        cleanupReport.errors.push(`❌ Emergency reset failed: ${error.message}`);
      }
    }

    const responseTime = Date.now() - startTime;
    const isHealthy = cleanupReport.errors.length === 0;

    console.log('🚨 EMERGENCY CLEANUP COMPLETED:', cleanupReport);

    res.json({
      success: isHealthy,
      message: isHealthy ? 'Cleanup completed successfully' : 'Cleanup completed with errors',
      report: cleanupReport,
      responseTime: `${responseTime}ms`,
      recommendations: isHealthy ? 
        ['Redis is healthy'] : 
        [
          'Consider restarting the application',
          'Check Redis logs for connection issues',
          'Use ?reset=true for complete reset if issues persist'
        ]
    });

  } catch (error) {
    console.error('🚨 EMERGENCY CLEANUP FAILED:', error);
    
    res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      details: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      action: 'Try again or contact support'
    });
  }
}

// --------------------------------------------------------
// 🛡️ MIDDLEWARE DE GESTION D'ERREUR GLOBAL - error-handler.js

export class GlobalErrorHandler {
  static handleApiError(error, req, res, endpoint) {
    const errorId = Date.now().toString();
    
    console.error(`[ERROR-${errorId}] 🚨 API Error in ${endpoint}:`, {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Determine error type and response
    let statusCode = 500;
    let errorResponse = {
      success: false,
      errorId,
      timestamp: new Date().toISOString(),
      endpoint
    };

    if (error.message.includes('Redis')) {
      statusCode = 503;
      errorResponse.error = 'Database connection issue';
      errorResponse.details = 'Redis service temporarily unavailable';
      errorResponse.action = 'Try again in a moment or use /api/redis-emergency-cleanup';
    } else if (error.message.includes('JSON')) {
      statusCode = 422;
      errorResponse.error = 'Data format error';
      errorResponse.details = 'Invalid data detected in storage';
      errorResponse.action = 'Run cleanup: /api/redis-emergency-cleanup';
    } else if (error.message.includes('already taken')) {
      statusCode = 400;
      errorResponse.error = error.message;
      errorResponse.action = 'Try a different name or rejoin';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorResponse.error = error.message;
    } else {
      errorResponse.error = 'Internal server error';
      errorResponse.details = process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred';
    }

    res.status(statusCode).json(errorResponse);
  }

  static wrapApiEndpoint(handler, endpointName) {
    return async (req, res) => {
      try {
        await handler(req, res);
      } catch (error) {
        GlobalErrorHandler.handleApiError(error, req, res, endpointName);
      }
    };
  }
}

// --------------------------------------------------------
// 🔧 WRAPPER POUR VOS ENDPOINTS EXISTANTS - endpoint-wrapper.js

// Exemple d'utilisation pour get-game-state-redis.mjs
export function wrapGetGameState(originalHandler) {
  return GlobalErrorHandler.wrapApiEndpoint(async (req, res) => {
    try {
      // Validation des paramètres
      const { historyOnly } = req.query;
      
      if (historyOnly && historyOnly !== 'true' && historyOnly !== 'false') {
        throw new Error('Invalid historyOnly parameter');
      }

      // Appel sécurisé de votre handler original
      await originalHandler(req, res);
      
    } catch (error) {
      // Si c'est une erreur Redis/JSON, suggérer le cleanup
      if (error.message.includes('JSON') || error.message.includes('Redis')) {
        throw new Error(`${error.message}. Run emergency cleanup at /api/redis-emergency-cleanup`);
      }
      throw error;
    }
  }, 'get-game-state-redis');
}

// Exemple d'utilisation pour join-game-redis.mjs
export function wrapJoinGame(originalHandler) {
  return GlobalErrorHandler.wrapApiEndpoint(async (req, res) => {
    try {
      // Validation des paramètres
      const { playerName, rejoin } = req.body;
      
      if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
        throw new Error('Player name is required and must be a valid string');
      }

      if (playerName.trim().length > 20) {
        throw new Error('Player name must be 20 characters or less');
      }

      if (rejoin !== undefined && typeof rejoin !== 'boolean') {
        throw new Error('Rejoin parameter must be boolean');
      }

      // Appel sécurisé
      await originalHandler(req, res);
      
    } catch (error) {
      throw error;
    }
  }, 'join-game-redis');
}

// --------------------------------------------------------
// 🎯 COMMENT UTILISER DANS VOS ENDPOINTS :

/*
// Dans get-game-state-redis.mjs :
import { wrapGetGameState } from './endpoint-wrapper.js';

async function originalHandler(req, res) {
  // Votre code existant...
}

export default wrapGetGameState(originalHandler);

// Dans join-game-redis.mjs :
import { wrapJoinGame } from './endpoint-wrapper.js';

async function originalJoinHandler(req, res) {
  // Votre code existant...
}

export default wrapJoinGame(originalJoinHandler);
*/