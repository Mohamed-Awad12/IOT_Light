const express = require('express');
const path = require('path');
const fetch = global.fetch || require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = 'https://awad123612.app.n8n.cloud/webhook-test/google-assistant';

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Send command to webhook
app.post('/api/control', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

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

app.post('/api/history/request', async (req, res) => {
    try {
        const AIO_USERNAME = process.env.AIO_USERNAME;
        const AIO_KEY = process.env.AIO_KEY ;
        const LIMIT = 40; 
        
        const response = await fetch(`https://io.adafruit.com/api/v2/${AIO_USERNAME}/feeds/light/data?limit=${LIMIT}`, {
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
