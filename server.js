const express = require('express');
const path = require('path');
const crypto = require('crypto');

const fetch = global.fetch || require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const WEBHOOK_URL = 'https://awad123612.app.n8n.cloud/webhook/google-assistant';
const HISTORY_PASSWORD = process.env.HISTORY_PASSWORD;

const validSessions = new Map();

const failedLoginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 3 * 60 * 1000;


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

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (!HISTORY_PASSWORD) {
        return res.json({ success: true, sessionToken: 'dev-mode' });
    }
    
    const attemptData = failedLoginAttempts.get(clientIp);
    console.log(failedLoginAttempts);
    if (attemptData) {
        const now = Date.now();
        if (attemptData.count >= MAX_LOGIN_ATTEMPTS && now < attemptData.lockoutUntil) {
            const remainingTime = Math.ceil((attemptData.lockoutUntil - now) / 1000);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            return res.status(429).json({ 
                success: false, 
                error: `Too many failed attempts. Try again in ${minutes}m ${seconds}s`,
                lockedOut: true,
                retryAfter: remainingTime
            });
        }

        if (now >= attemptData.lockoutUntil) {
            failedLoginAttempts.delete(clientIp);
        }
    }
    
    if (password !== HISTORY_PASSWORD) {
       
        const currentAttempts = failedLoginAttempts.get(clientIp) || { count: 0, lockoutUntil: 0 };
        currentAttempts.count += 1;
        
        if (currentAttempts.count >= MAX_LOGIN_ATTEMPTS) {
            currentAttempts.lockoutUntil = Date.now() + LOCKOUT_DURATION;
        }
        
        failedLoginAttempts.set(clientIp, currentAttempts);
        
        const attemptsRemaining = MAX_LOGIN_ATTEMPTS - currentAttempts.count;
        

        return setTimeout(() => {
            if (currentAttempts.count >= MAX_LOGIN_ATTEMPTS) {
                res.status(429).json({ 
                    success: false, 
                    error: 'Too many failed attempts. Locked out for 3 minutes.',
                    lockedOut: true,
                    retryAfter: LOCKOUT_DURATION / 1000
                });
            } else {
                
                
                res.status(401).json({ 
                    success: false, 
                    error: `Invalid password. ${attemptsRemaining} attempts remaining.`
                });
            }
        }, 1000);
    }
    
    // Successful login - clear any failed attempts
    failedLoginAttempts.delete(clientIp);
    
    // Generate secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session with 1 hour expiry
    validSessions.set(sessionToken, {
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    });
    
    res.json({ 
        success: true, 
        sessionToken,
        expiresIn: 3600 // seconds
    });
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
