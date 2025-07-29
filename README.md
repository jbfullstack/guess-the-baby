# REDIS

## Test redis

curl https://guess-the-baby.vercel.app/api/redis-test

## Reset redis

curl -X POST https://guess-the-baby.vercel.app/api/reset-game-state-redis \
  -H "Content-Type: application/json" \
  -d '{"resetType":"hard"}'