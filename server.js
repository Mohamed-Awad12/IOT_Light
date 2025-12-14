const express = require('express');
const path = require('path');
// Ensure fetch is available on older Node versions
const fetch = global.fetch || require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
// Centralized webhook URL (n8n)
const WEBHOOK_URL = 'https://awad123612.app.n8n.cloud/webhook/google-assistant';


// Parse JSON bodies and serve static files
app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Endpoint to request history (called by frontend)
// Request history from webhook and return immediately
app.post('/api/history/request', async (req, res) => {
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

// Endpoint to receive history data from webhook
// Receive history pushed from webhook (optional path)
app.post('/api/history', (req, res) => {
    try {
        const { response: historyData } = req.body;
        console.log('History received:', historyData);
        
        // Store the history temporarily
        app.locals.lastHistory = historyData;
        
        res.json({ success: true, message: 'History received' });
    } catch (error) {
        console.error('Error receiving history:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get the latest history without clearing (frontend clears when done)
app.get('/api/history', (req, res) => {
    const history = app.locals.lastHistory || null;
    // Don't clear the history automatically - let frontend clear it
    res.json({ history });
});

// Endpoint to clear history
// Explicitly clear stored history
app.delete('/api/history', (req, res) => {
    app.locals.lastHistory = null;
    res.json({ success: true, message: 'History cleared' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
