const express = require('express');
const config = require('../config');
const { verifySession } = require('../middlewares');

const fetch = global.fetch || require('node-fetch');

const router = express.Router();


router.post('/request', verifySession, async (req, res) => {
    try {
        const response = await fetch(
            `https://io.adafruit.com/api/v2/${config.AIO_USERNAME}/feeds/light/data?limit=30`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AIO-Key': config.AIO_KEY,
                },
            }
        );

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
                error: `Adafruit IO returned status ${response.status}` 
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

module.exports = router;
