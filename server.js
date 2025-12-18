const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const config = require('./src/config');
const { authRoutes, controlRoutes, statusRoutes, historyRoutes } = require('./src/routes');
const { session, rateLimit } = require('./src/models');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Fetch lamp status from Adafruit IO
async function fetchLampStatus() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(
            `https://io.adafruit.com/api/v2/${config.AIO_USERNAME}/feeds/light/data?limit=1`,
            {
                method: 'GET',
                headers: {
                    'X-AIO-Key': config.AIO_KEY
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const value = data[0].value.toLowerCase();
                return value === 'on' || value === '1' || value === 'true';
            }
        }
        return false;
    } catch (error) {
        console.error('Error fetching lamp status:', error);
        return null;
    }
}

// Broadcast status to all connected clients
function broadcastStatus(isOn) {
    const message = JSON.stringify({ type: 'status', isOn });
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// WebSocket connection handling
wss.on('connection', async (ws) => {
    clients.add(ws);
    console.log('Client connected. Total clients:', clients.size);
    
    // Send current status to new client
    const isOn = await fetchLampStatus();
    if (isOn !== null) {
        ws.send(JSON.stringify({ type: 'status', isOn }));
    }
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'getStatus') {
                const isOn = await fetchLampStatus();
                if (isOn !== null) {
                    ws.send(JSON.stringify({ type: 'status', isOn }));
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected. Total clients:', clients.size);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Poll Adafruit IO and broadcast updates (server-side polling)
let lastKnownStatus = null;
async function pollAndBroadcast() {
    if (clients.size === 0) return;
    
    const isOn = await fetchLampStatus();
    if (isOn !== null && isOn !== lastKnownStatus) {
        lastKnownStatus = isOn;
        broadcastStatus(isOn);
    }
}

// Poll every second when there are connected clients
setInterval(pollAndBroadcast, 1000);

// Export broadcast function for use in routes
app.set('broadcastStatus', broadcastStatus);


app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/control', controlRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/history', historyRoutes);


if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    setInterval(() => {
        session.cleanupExpiredSessions();
        rateLimit.cleanupExpiredAttempts();
    }, 10 * 60 * 1000);
}


if (!process.env.VERCEL) {
    server.listen(config.PORT, () => {
        console.log(`Server is running on http://localhost:${config.PORT}`);
        console.log('WebSocket server is ready');
    });
}

module.exports = app;
