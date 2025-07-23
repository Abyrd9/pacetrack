// Redis Lua script for atomic token bucket operations
// Uses hash fields for better performance and atomicity
// See: https://lucia-auth.com/rate-limit/token-bucket
export const TOKEN_BUCKET_SCRIPT = `
-- Returns 1 if allowed, 0 if not
local key                   = KEYS[1]
local max                   = tonumber(ARGV[1])
local refillIntervalSeconds = tonumber(ARGV[2])
local cost                  = tonumber(ARGV[3])
local nowMilliseconds       = tonumber(ARGV[4])

-- Check if key exists
local exists = redis.call("EXISTS", key)

if exists == 0 then
	local expiresInSeconds = cost * refillIntervalSeconds
	redis.call("HSET", key, "count", max - cost, "refilled_at_ms", nowMilliseconds)
	redis.call("EXPIRE", key, expiresInSeconds)
	return 1
end

-- Get existing values
local count = tonumber(redis.call("HGET", key, "count"))
local refilledAtMilliseconds = tonumber(redis.call("HGET", key, "refilled_at_ms"))

-- Calculate refills
local refill = math.floor((nowMilliseconds - refilledAtMilliseconds) / (refillIntervalSeconds * 1000))
count = math.min(count + refill, max)
refilledAtMilliseconds = refilledAtMilliseconds + refill * refillIntervalSeconds * 1000

if count < cost then
	return 0
end

count = count - cost
local expiresInSeconds = (max - count) * refillIntervalSeconds
redis.call("HSET", key, "count", count, "refilled_at_ms", refilledAtMilliseconds)
redis.call("EXPIRE", key, expiresInSeconds)
return 1
`;
