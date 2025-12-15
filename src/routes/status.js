const express = require('express');

const router = express.Router();

// Store for status (in production, use Redis)
let lastStatus = null;

/**
 * POST /api/status
 * Receive status updates from webhook
 */
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

/**
 * GET /api/status
 * Get the latest status (one-shot)
 */
router.get('/', (req, res) => {
    const status = lastStatus;
    // Clear the status after reading it
    lastStatus = null;
    res.json({ status });
});

module.exports = router;
