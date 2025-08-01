// 🚨 URGENT : Créer ce fichier → api/redis-emergency-cleanup.mjs
// Version ultra-simple sans dépendances

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const startTime = Date.now();

  try {
    console.log('🚨 EMERGENCY CLEANUP - Starting...');

    // CORS pour appel depuis navigateur
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const report = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: [],
      totalKeys: 0,
      deletedKeys: 0
    };

    // 1. Test Redis connection
    try {
      const pingResult = await redis.ping();
      report.actions.push(`✅ Redis ping: ${pingResult}`);
    } catch (error) {
      report.errors.push(`❌ Redis connection failed: ${error.message}`);
      return res.status(503).json({
        success: false,
        error: 'Redis connection failed',
        report,
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // 2. Get all relevant keys
    let allKeys = [];
    try {
      const gameKeys = await redis.keys('game:*') || [];
      const scoreKeys = await redis.keys('score:*') || [];
      const voteKeys = await redis.keys('vote:*') || [];
      const playerKeys = await redis.keys('players:*') || [];
      
      allKeys = [...gameKeys, ...scoreKeys, ...voteKeys, ...playerKeys];
      report.totalKeys = allKeys.length;
      report.actions.push(`📊 Found ${allKeys.length} keys total`);
      report.actions.push(`  - Game keys: ${gameKeys.length}`);
      report.actions.push(`  - Score keys: ${scoreKeys.length}`);
      report.actions.push(`  - Vote keys: ${voteKeys.length}`);
      report.actions.push(`  - Player keys: ${playerKeys.length}`);
    } catch (error) {
      report.errors.push(`❌ Failed to get keys: ${error.message}`);
    }

    // 3. Emergency reset if requested
    const shouldReset = req.query.reset === 'true' || req.body?.reset === true;
    
    if (shouldReset && allKeys.length > 0) {
      try {
        report.actions.push('🚨 EMERGENCY RESET REQUESTED - DELETING ALL GAME DATA');
        
        // Delete in batches to avoid timeout
        const batchSize = 50;
        for (let i = 0; i < allKeys.length; i += batchSize) {
          const batch = allKeys.slice(i, i + batchSize);
          await redis.del(...batch);
          report.deletedKeys += batch.length;
          report.actions.push(`🗑️ Deleted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} keys`);
        }
        
        report.actions.push(`💥 RESET COMPLETE: ${report.deletedKeys} keys deleted`);
      } catch (error) {
        report.errors.push(`❌ Reset failed: ${error.message}`);
      }
    } else if (!shouldReset) {
      report.actions.push('ℹ️ No reset requested - use ?reset=true to delete all data');
    }

    // 4. Validate remaining data (only if no reset)
    if (!shouldReset && allKeys.length > 0) {
      try {
        let validKeys = 0;
        let corruptedKeys = 0;
        
        // Test a few random keys to check for corruption
        const samplesToTest = Math.min(10, allKeys.length);
        const randomKeys = allKeys.sort(() => 0.5 - Math.random()).slice(0, samplesToTest);
        
        for (const key of randomKeys) {
          try {
            const value = await redis.get(key);
            if (value !== null) {
              // Try to parse if it looks like JSON
              if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                JSON.parse(value); // Will throw if corrupted
              }
              validKeys++;
            }
          } catch (parseError) {
            corruptedKeys++;
            report.actions.push(`🔧 Found corrupted key: ${key}`);
            
            // Delete corrupted key
            try {
              await redis.del(key);
              report.actions.push(`🗑️ Deleted corrupted key: ${key}`);
              report.deletedKeys++;
            } catch (delError) {
              report.errors.push(`❌ Failed to delete corrupted key ${key}: ${delError.message}`);
            }
          }
        }
        
        report.actions.push(`🔍 Tested ${samplesToTest} keys: ${validKeys} valid, ${corruptedKeys} corrupted`);
      } catch (error) {
        report.errors.push(`❌ Validation failed: ${error.message}`);
      }
    }

    // 5. Final status
    const responseTime = Date.now() - startTime;
    const isHealthy = report.errors.length === 0;
    
    console.log('🚨 EMERGENCY CLEANUP COMPLETED:', report);

    return res.status(200).json({
      success: isHealthy,
      message: shouldReset ? 
        `Emergency reset completed - deleted ${report.deletedKeys} keys` :
        `Cleanup completed - found ${report.totalKeys} keys`,
      report,
      responseTime: `${responseTime}ms`,
      nextSteps: shouldReset ? [
        '✅ Redis cleaned - your app should work now',
        '🎮 Try joining a game to test',
        '📊 Check app functionality'
      ] : [
        '🔧 Run with ?reset=true to delete all data if issues persist',
        '📊 Check the report above for any corrupted keys found',
        '🎮 Test your app functionality'
      ]
    });

  } catch (error) {
    console.error('🚨 EMERGENCY CLEANUP CRASHED:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      details: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      action: 'Contact support or try manual Redis cleanup'
    });
  }
}