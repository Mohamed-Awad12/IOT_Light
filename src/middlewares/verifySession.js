const config = require('../config');
const { session } = require('../models');

/**
 * Verify session middleware
 * Checks if the request has a valid session token
 */
const verifySession = (req, res, next) => {
    // Skip auth if no password is configured (development mode)
    if (!config.HISTORY_PASSWORD) {
        return next();
    }
    
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized: No session token provided' 
        });
    }
    
    if (!session.isValidSession(sessionToken)) {
        return res.status(401).json({ 
            success: false, 
            error: 'Unauthorized: Invalid or expired session' 
        });
    }
    
    next();
};

module.exports = verifySession;
