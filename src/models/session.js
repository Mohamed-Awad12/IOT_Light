const config = require('../config');

const validSessions = new Map();


function createSession(sessionToken) {
    validSessions.set(sessionToken, {
        createdAt: Date.now(),
        expiresAt: Date.now() + config.SESSION_EXPIRY
    });
}


function getSession(sessionToken) {
    return validSessions.get(sessionToken);
}


function deleteSession(sessionToken) {
    validSessions.delete(sessionToken);
}


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
