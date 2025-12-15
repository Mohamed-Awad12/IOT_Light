const config = require('../config');

let redisClient = null;
let redisConnected = false;
let redisInitializing = false;

async function getRedisClient() {
   
    if (redisClient && redisConnected) {
        return redisClient;
    }
    
 
    if (redisInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return redisClient;
    }
    
    redisInitializing = true;
    
    try {
       
        if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
            const { Redis } = require('@upstash/redis');
            redisClient = new Redis({
                url: config.UPSTASH_REDIS_REST_URL,
                token: config.UPSTASH_REDIS_REST_TOKEN,
            });
            redisClient.type = 'upstash';
            redisConnected = true;
            return redisClient;
        }
        
       
        if (process.env.REDIS_URL) {
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


const failedLoginAttempts = new Map();


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


async function setLoginAttempts(ip, data) {
    failedLoginAttempts.set(ip, data);
    
    const client = await getRedisClient();
    if (!client) return;
    
    try {
        await client.set(`login_attempts:${ip}`, JSON.stringify(data), { ex: 300 });
    } catch (error) {
        console.error('Redis set error:', error);
    }
}


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
