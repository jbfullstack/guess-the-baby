import { RedisHealth, GameStateRedis, PlayersRedis, ScoresRedis } from '../src/services/redis.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  const tests = [];

  try {
    // Test 1: Basic connection
    console.log('🔍 Testing Redis connection...');
    const pingStart = Date.now();
    const pingResult = await RedisHealth.ping();
    const pingTime = Date.now() - pingStart;
    
    tests.push({
      name: 'Redis Ping',
      status: pingResult.status === 'healthy' ? 'PASS' : 'FAIL',
      time: `${pingTime}ms`,
      result: pingResult
    });

    // Test 2: Game state operations
    console.log('🎮 Testing game state operations...');
    const gameStateStart = Date.now();
    
    const testGameState = {
      gameId: 'test-123',
      gameMode: 'testing',
      currentRound: 1
    };
    
    await GameStateRedis.setCurrentGame(testGameState);
    const retrievedState = await GameStateRedis.getCurrentGame();
    const gameStateTime = Date.now() - gameStateStart;
    
    tests.push({
      name: 'Game State Read/Write',
      status: retrievedState.gameId === 'test-123' ? 'PASS' : 'FAIL',
      time: `${gameStateTime}ms`,
      result: { written: testGameState, retrieved: retrievedState }
    });

    // Test 3: Players operations
    console.log('👥 Testing players operations...');
    const playersStart = Date.now();
    
    const testPlayer = {
      name: 'TestPlayer',
      id: 'test-player-123'
    };
    
    // Clear any existing test data first
    try {
      await PlayersRedis.removePlayer('TestPlayer');
    } catch (e) {
      // Ignore if player doesn't exist
    }
    
    await PlayersRedis.addPlayer(testPlayer);
    const players = await PlayersRedis.getPlayers();
    const playersTime = Date.now() - playersStart;
    
    tests.push({
      name: 'Players Management',
      status: players.some(p => p.name === 'TestPlayer') ? 'PASS' : 'FAIL',
      time: `${playersTime}ms`,
      result: { added: testPlayer, players: players }
    });

    // Test 4: Scores operations
    console.log('🏆 Testing scores operations...');
    const scoresStart = Date.now();
    
    await ScoresRedis.setScore('TestPlayer', 5);
    const newScore = await ScoresRedis.incrementScore('TestPlayer', 3);
    const allScores = await ScoresRedis.getScores();
    const scoresTime = Date.now() - scoresStart;
    
    tests.push({
      name: 'Scores Management',
      status: newScore === 8 && allScores.TestPlayer === 8 ? 'PASS' : 'FAIL',
      time: `${scoresTime}ms`,
      result: { finalScore: newScore, allScores: allScores }
    });

    // Test 5: Performance test
    console.log('⚡ Testing performance...');
    const perfStart = Date.now();
    
    const perfPromises = [];
    for (let i = 0; i < 10; i++) {
      perfPromises.push(RedisHealth.ping());
    }
    
    await Promise.all(perfPromises);
    const perfTime = Date.now() - perfStart;
    const avgTime = perfTime / 10;
    
    tests.push({
      name: 'Performance (10 parallel pings)',
      status: avgTime < 100 ? 'PASS' : 'WARN',
      time: `${perfTime}ms total, ${avgTime.toFixed(1)}ms avg`,
      result: { totalTime: perfTime, averageTime: avgTime }
    });

    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await PlayersRedis.removePlayer('TestPlayer');
    await ScoresRedis.resetScores();
    await GameStateRedis.resetGame();

    const totalTime = Date.now() - startTime;
    const passedTests = tests.filter(t => t.status === 'PASS').length;
    const overallStatus = passedTests === tests.length ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';

    res.json({
      status: overallStatus,
      totalTime: `${totalTime}ms`,
      redisHealth: 'Connected',
      testsRun: tests.length,
      testsPassed: passedTests,
      testsFailed: tests.length - passedTests,
      tests: tests,
      recommendation: avgTime < 50 
        ? '🚀 Redis is performing excellently! Ready for production.'
        : avgTime < 100 
        ? '✅ Redis is performing well for real-time gaming.'
        : '⚠️ Redis latency is high. Check your connection.',
      
      comparison: {
        'Redis (this test)': `~${avgTime.toFixed(0)}ms`,
        'GitHub API (old system)': '~800-2000ms',
        'Improvement': `${Math.round(1500 / avgTime)}x faster`
      }
    });

  } catch (error) {
    console.error('Redis test failed:', error);
    
    res.status(500).json({
      status: 'REDIS CONNECTION FAILED',
      error: error.message,
      troubleshooting: {
        step1: 'Check UPSTASH_REDIS_REST_URL in Vercel environment variables',
        step2: 'Check UPSTASH_REDIS_REST_TOKEN in Vercel environment variables',
        step3: 'Verify Upstash Redis database is active',
        step4: 'Check network connectivity to Upstash'
      },
      tests: tests
    });
  }
}