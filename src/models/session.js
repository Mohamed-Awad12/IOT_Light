const config = require('../config');

// In-memory session store (use Redis in production for persistence)
const validSessions = new Map();

/**
 * Create a new session
 */
function createSession(sessionToken) {
    validSessions.set(sessionToken, {
        createdAt: Date.now(),
        expiresAt: Date.now() + config.SESSION_EXPIRY
    });
}

/**
 * Get a session by token
 */
function getSession(sessionToken) {
    return validSessions.get(sessionToken);
}

/**
 * Delete a session
 */
function deleteSession(sessionToken) {
    validSessions.delete(sessionToken);
}

/**
 * Check if session exists and is valid
 */
function isValidSession(sessionToken) {
    if (!sessionToken || !validSessions.has(sessionToken)) {
        return false;
    }
    
    const session = validSessions.get(sessionToken);
    if (Date.now() > session.expiresAt) {
        validSessions.delete(sessionToken);
        return false;
    }
    
    return true;
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, data] of validSessions) {
        if (now > data.expiresAt) {
            validSessions.delete(token);
        }
    }
}

module.exports = {
    createSession,
    getSession,
    deleteSession,
    isValidSession,
    cleanupExpiredSessions,
};
