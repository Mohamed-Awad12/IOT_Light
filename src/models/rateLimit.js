const config = require('../config');

// Initialize Redis client - lazy loading for serverless
let redisClient = null;
let redisConnected = false;
let redisInitializing = false;

async function getRedisClient() {
    // Already connected
    if (redisClient && redisConnected) {
        return redisClient;
    }
    
    // Already initializing, wait
    if (redisInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return redisClient;
    }
    
    redisInitializing = true;
    
    try {
        // Option 1: Upstash Redis (REST API) - Best for serverless!
        if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
            const { Redis } = require('@upstash/redis');
            redisClient = new Redis({
                url: config.UPSTASH_REDIS_REST_URL,
                token: config.UPSTASH_REDIS_REST_TOKEN,
            });
            redisClient.type = 'upstash';
            redisConnected = true;
            console.log('Rate Limiter: Using Upstash Redis');
            return redisClient;
        }
        
        // Option 2: Redis Cloud - use HTTP wrapper for serverless compatibility
        if (process.env.REDIS_URL) {
            // For serverless, we'll use in-memory fallback with Redis Cloud
            // because TCP connections don't persist between invocations
            console.log('Rate Limiter: Redis URL found, but using in-memory for serverless compatibility');
            console.log('Tip: Use Upstash Redis for better serverless support');
            redisConnected = false;
            return null;
        }
    } catch (error) {
        console.error('Redis init error:', error);
        redisConnected = false;
    } finally {
        redisInitializing = false;
    }
    
    return null;
}

// Fallback in-memory store
const failedLoginAttempts = new Map();

/**
 * Get login attempts for an IP address
 */
async function getLoginAttempts(ip) {
    const client = await getRedisClient();
    
    if (!client) {
        return failedLoginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    }
    
    try {
        const data = await client.get(`login_attempts:${ip}`);
        if (data) {
            return typeof data === 'string' ? JSON.parse(data) : data;
        }
        return { count: 0, lockoutUntil: 0 };
    } catch (error) {
        console.error('Redis get error:', error);
        return failedLoginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    }
}

/**
 * Set login attempts for an IP address
 */
async function setLoginAttempts(ip, data) {
    // Always set in memory as fallback
    failedLoginAttempts.set(ip, data);
    
    const client = await getRedisClient();
    if (!client) return;
    
    try {
        // Upstash Redis uses .set() with options
        await client.set(`login_attempts:${ip}`, JSON.stringify(data), { ex: 300 });
    } catch (error) {
        console.error('Redis set error:', error);
    }
}

/**
 * Clear login attempts for an IP address
 */
async function clearLoginAttempts(ip) {
    failedLoginAttempts.delete(ip);
    
    const client = await getRedisClient();
    if (!client) return;
    
    try {
        await client.del(`login_attempts:${ip}`);
    } catch (error) {
        console.error('Redis del error:', error);
    }
}

/**
 * Cleanup expired entries (for in-memory fallback)
 */
function cleanupExpiredAttempts() {
    const now = Date.now();
    for (const [ip, data] of failedLoginAttempts) {
        if (now > data.lockoutUntil) {
            failedLoginAttempts.delete(ip);
        }
    }
}

module.exports = {
    getLoginAttempts,
    setLoginAttempts,
    clearLoginAttempts,
    cleanupExpiredAttempts,
};
