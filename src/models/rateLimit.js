const config = require('../config');

// Initialize Redis if credentials are available
let redis = null;
if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN,
    });
}

// Fallback in-memory store (for local development)
const failedLoginAttempts = new Map();

/**
 * Get login attempts for an IP address
 */
async function getLoginAttempts(ip) {
    if (!redis) {
        return failedLoginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    }
    
    try {
        const data = await redis.get(`login_attempts:${ip}`);
        return data || { count: 0, lockoutUntil: 0 };
    } catch (error) {
        console.error('Redis get error:', error);
        return { count: 0, lockoutUntil: 0 };
    }
}

/**
 * Set login attempts for an IP address
 */
async function setLoginAttempts(ip, data) {
    if (!redis) {
        failedLoginAttempts.set(ip, data);
        return;
    }
    
    try {
        // Set with expiry of 5 minutes (auto-cleanup)
        await redis.set(`login_attempts:${ip}`, data, { ex: 300 });
    } catch (error) {
        console.error('Redis set error:', error);
    }
}

/**
 * Clear login attempts for an IP address
 */
async function clearLoginAttempts(ip) {
    if (!redis) {
        failedLoginAttempts.delete(ip);
        return;
    }
    
    try {
        await redis.del(`login_attempts:${ip}`);
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
