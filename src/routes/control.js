const express = require('express');
const config = require('../config');

const fetch = global.fetch || require('node-fetch');

const router = express.Router();

let lastStatus = null;


router.post('/', async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        lastStatus = null;

        const response = await fetch(config.WEBHOOK_URL, {
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

router.post('/direct', async (req, res) => {
    try {
        const { value } = req.body;
        
        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }

        const response = await fetch(
            `https://io.adafruit.com/api/v2/${config.AIO_USERNAME}/feeds/light/data`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AIO-Key': config.AIO_KEY
                },
                body: JSON.stringify({ value })
            }
        );

        if (response.ok) {
            const data = await response.json();
            res.json({ success: true, data });
        } else {
            res.status(response.status).json({ 
                success: false, 
                error: `Adafruit IO returned status ${response.status}` 
            });
        }
    } catch (error) {
        console.error('Error sending direct command:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
