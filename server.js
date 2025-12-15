const express = require('express');
const path = require('path');
const crypto = require('crypto');

const fetch = global.fetch || require('node-fetch');

// Redis client for rate limiting
let redisClient = null;
let redisConnected = false;

// Support both Upstash and Redis Cloud
async function initRedis() {
    // Option 1: Upstash Redis (REST API)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Redis } = require('@upstash/redis');
        redisClient = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        redisClient.type = 'upstash';
        redisConnected = true;
        console.log('Connected to Upstash Redis');
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
            console.log('Connected to Redis Cloud');
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

// Initialize Redis on startup
initRedis();

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = 'https://awad123612.app.n8n.cloud/webhook/google-assistant';
const HISTORY_PASSWORD = process.env.HISTORY_PASSWORD;

const validSessions = new Map();

const failedLoginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 3 * 60 * 1000; 
const LOCKOUT_DURATION_SECONDS = 180; 


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


setInterval(() => {
    const now = Date.now();
    for (const [token, data] of validSessions) {
        if (now > data.expiresAt) {
            validSessions.delete(token);
        }
    }

    for (const [ip, data] of failedLoginAttempts) {
        if (now > data.lockoutUntil) {
            failedLoginAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000);


const verifySession = (req, res, next) => {
    if (!HISTORY_PASSWORD) {
        return next();
    }
    
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken || !validSessions.has(sessionToken)) {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized: Please login first' 
        });
    }
    
    const session = validSessions.get(sessionToken);
    if (Date.now() > session.expiresAt) {
        validSessions.delete(sessionToken);
        return res.status(401).json({ 
            success: false, 
            error: 'Session expired: Please login again' 
        });
    }
    
    next();
};



app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/api/auth/status', (req, res) => {
    res.json({ 
        requiresAuth: !!HISTORY_PASSWORD,
        isLoggedIn: false 
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    if (!HISTORY_PASSWORD) {
        return res.json({ success: true, sessionToken: 'dev-mode' });
    }
    
    try {
        // Check if IP is currently locked out
        const attemptData = await getLoginAttempts(clientIp);
        
        if (attemptData && attemptData.count >= MAX_LOGIN_ATTEMPTS) {
            const now = Date.now();
            if (now < attemptData.lockoutUntil) {
                const remainingTime = Math.ceil((attemptData.lockoutUntil - now) / 1000);
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                return res.status(429).json({ 
                    success: false, 
                    error: `Too many failed attempts. Try again in ${minutes}m ${seconds}s`,
                    lockedOut: true,
                    retryAfter: remainingTime
                });
            } else {
                // Lockout expired, clear it
                await clearLoginAttempts(clientIp);
            }
        }
        
        if (password !== HISTORY_PASSWORD) {
            // Wrong password - record attempt
            const currentAttempts = await getLoginAttempts(clientIp);
            currentAttempts.count = (currentAttempts.count || 0) + 1;
            
            if (currentAttempts.count >= MAX_LOGIN_ATTEMPTS) {
                currentAttempts.lockoutUntil = Date.now() + LOCKOUT_DURATION;
            }
            
            await setLoginAttempts(clientIp, currentAttempts);
            
            const attemptsRemaining = MAX_LOGIN_ATTEMPTS - currentAttempts.count;
            
            // Add delay to slow down attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (currentAttempts.count >= MAX_LOGIN_ATTEMPTS) {
                return res.status(429).json({ 
                    success: false, 
                    error: 'Too many failed attempts. Locked out for 3 minutes.',
                    lockedOut: true,
                    retryAfter: LOCKOUT_DURATION_SECONDS
                });
            } else {
                return res.status(401).json({ 
                    success: false, 
                    error: `Invalid password. ${attemptsRemaining} attempts remaining.`
                });
            }
        }
        
        // Successful login - clear any failed attempts
        await clearLoginAttempts(clientIp);
        
        // Generate secure session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        // Store session with 1 hour expiry
        validSessions.set(sessionToken, {
            createdAt: Date.now(),
            expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
        });
        
        return res.json({ 
            success: true, 
            sessionToken,
            expiresIn: 3600 // seconds
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error during authentication'
        });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    const sessionToken = req.headers['x-session-token'];
    if (sessionToken) {
        validSessions.delete(sessionToken);
    }
    res.json({ success: true });
});


// Send control command to webhook (turn on/off)
app.post('/api/control', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        // Clear old status before sending new command
        app.locals.lastStatus = null;

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command })
        });

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            res.json({ success: true, message: `Command sent: ${command}`, data });
        } else {
            res.status(response.status).json({ 
                success: false, 
                error: `Webhook returned status ${response.status}` 
            });
        }
    } catch (error) {
        console.error('Error sending command:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint to receive status updates from webhook
// Receive status updates from webhook
app.post('/api/status', (req, res) => {
    try {
        const { response: statusMessage } = req.body;
        console.log('Status received:', statusMessage);
        
        // Store the status temporarily (in production, use a proper state management)
        app.locals.lastStatus = statusMessage;
        
        res.json({ success: true, message: 'Status received' });
    } catch (error) {
        console.error('Error receiving status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get the latest status (one-shot)
app.get('/api/status', (req, res) => {
    const status = app.locals.lastStatus || null;
    // Clear the status after reading it
    app.locals.lastStatus = null;
    res.json({ status });
});

// Endpoint to request history (called by frontend) - Protected with session auth
app.post('/api/history/request', verifySession, async (req, res) => {
    try {
        // Adafruit IO API - requires X-AIO-Key header for authentication
        const AIO_USERNAME = process.env.AIO_USERNAME;
        const AIO_KEY = process.env.AIO_KEY ; // Set this in environment variables
        
        const response = await fetch(`https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/light/data?limit=30`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-AIO-Key': AIO_KEY,
            },
        });

        if (response.ok) {
            const contentType = response.headers.get('content-type');
            let historyData;
            
            if (contentType && contentType.includes('application/json')) {
                historyData = await response.json();
            } else {
                historyData = await response.text();
            }
            
            // Return the history data directly
            res.json({ success: true, data: historyData });
        } else {
            res.status(response.status).json({ 
                success: false, 
                error: `Webhook returned status ${response.status}` 
            });
        }
    } catch (error) {
        console.error('Error requesting history:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});




app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
