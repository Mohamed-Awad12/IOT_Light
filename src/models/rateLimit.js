const config = require('../config');

// Initialize Redis client
let redisClient = null;
let redisConnected = false;

async function initRedis() {
    // Option 1: Upstash Redis (REST API)
    if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = require('@upstash/redis');
        redisClient = new Redis({
            url: config.UPSTASH_REDIS_REST_URL,
            token: config.UPSTASH_REDIS_REST_TOKEN,
        });
        redisClient.type = 'upstash';
        redisConnected = true;
        console.log('Rate Limiter: Connected to Upstash Redis');
        return;
    }
    
    // Option 2: Redis Cloud or standard Redis (connection string)
    if (process.env.REDIS_URL) {
        const { createClient } = require('redis');
        redisClient = createClient({
            url: process.env.REDIS_URL
        });
        
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
            redisConnected = false;
        });
        
        redisClient.on('connect', () => {
            console.log('Rate Limiter: Connected to Redis Cloud');
            redisConnected = true;
        });
        
        try {
            await redisClient.connect();
            redisClient.type = 'standard';
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            redisConnected = false;
        }
    }
}

// Initialize Redis on module load
initRedis();

// Fallback in-memory store (for local development)
const failedLoginAttempts = new Map();

/**
 * Get login attempts for an IP address
 */
async function getLoginAttempts(ip) {
    if (!redisClient || !redisConnected) {
        return failedLoginAttempts.get(ip) || { count: 0, lockoutUntil: 0 };
    }
    
    try {
        let data;
        if (redisClient.type === 'upstash') {
            data = await redisClient.get(`login_attempts:${ip}`);
        } else {
            const result = await redisClient.get(`login_attempts:${ip}`);
            data = result ? JSON.parse(result) : null;
        }
        return data || { count: 0, lockoutUntil: 0 };
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
    
    if (!redisClient || !redisConnected) {
        return;
    }
    
    try {
        if (redisClient.type === 'upstash') {
            await redisClient.set(`login_attempts:${ip}`, data, { ex: 300 });
        } else {
            await redisClient.setEx(`login_attempts:${ip}`, 300, JSON.stringify(data));
        }
    } catch (error) {
        console.error('Redis set error:', error);
    }
}

/**
 * Clear login attempts for an IP address
 */
async function clearLoginAttempts(ip) {
    failedLoginAttempts.delete(ip);
    
    if (!redisClient || !redisConnected) {
        return;
    }
    
    try {
        await redisClient.del(`login_attempts:${ip}`);
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
