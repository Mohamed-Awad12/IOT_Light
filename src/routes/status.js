const express = require('express');

const router = express.Router();

let lastStatus = null;


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
