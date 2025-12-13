const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = 'https://ewgfdfgre.app.n8n.cloud/webhook/google-assistant';


app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


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

// Endpoint to get the latest status
app.get('/api/status', (req, res) => {
    const status = app.locals.lastStatus || null;
    // Clear the status after reading it
    app.locals.lastStatus = null;
    res.json({ status });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
