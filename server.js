const express = require('express');
const path = require('path');
// Ensure fetch is available on older Node versions
const fetch = global.fetch || require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
// Centralized webhook URL (n8n)
const WEBHOOK_URL = 'https://awad123612.app.n8n.cloud/webhook/google-assistant';
// API key for protecting sensitive endpoints
const API_SECRET = process.env.API_SECRET;

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!API_SECRET) {
        // If no secret is configured, allow access (for development)
        return next();
    }
    
    if (!apiKey || apiKey !== API_SECRET) {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized: Invalid or missing API key' 
        });
    }
    
    next();
};


// Parse JSON bodies and serve static files
app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Provide API key to same-origin frontend requests only
app.get('/api/config', (req, res) => {
    // Only provide the key if the request comes from the same origin
    const referer = req.headers.referer || '';
    const host = req.headers.host || '';
    
    // Check if request is from same origin
    if (referer.includes(host) || !API_SECRET) {
        res.json({ apiKey: API_SECRET || null });
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
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

// Endpoint to request history (called by frontend) - Protected with API key
app.post('/api/history/request', verifyApiKey, async (req, res) => {
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
