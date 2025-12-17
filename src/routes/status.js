const express = require('express');
const config = require('../config');

const router = express.Router();

let lastStatus = null;

router.get('/lamp', async (req, res) => {
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
                const isOn = value === 'on' || value === '1' || value === 'true';
                res.json({ success: true, isOn });
            } else {
                res.json({ success: true, isOn: false });
            }
        } else {
            res.status(response.status).json({ success: false, error: 'Failed to fetch status' });
        }
    } catch (error) {
        console.error('Error fetching lamp status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { response: statusMessage } = req.body;
        console.log('Status received:', statusMessage);
        
        lastStatus = statusMessage;
        
        res.json({ success: true, message: 'Status received' });
    } catch (error) {
        console.error('Error receiving status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});


router.get('/', (req, res) => {
    const status = lastStatus;
    lastStatus = null;
    res.json({ status });
});

module.exports = router;
