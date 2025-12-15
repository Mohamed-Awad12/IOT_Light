const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const { session, rateLimit } = require('../models');

const router = express.Router();

// Verify reCAPTCHA v2 token
async function verifyRecaptcha(token) {
    if (!token) return false;
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${config.RECAPTCHA_SECRET_KEY}&response=${token}`
        });
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return false;
    }
}


router.get('/status', (req, res) => {
    res.json({ 
        requiresAuth: !!config.HISTORY_PASSWORD,
        isLoggedIn: false 
    });
});


router.post('/login', async (req, res) => {
    const { password, recaptchaToken } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    // Verify reCAPTCHA first
    const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!isRecaptchaValid) {
        return res.status(400).json({ 
            success: false, 
            error: 'reCAPTCHA verification failed. Please try again.'
        });
    }
   
    if (!config.HISTORY_PASSWORD) {
        return res.json({ success: true, sessionToken: 'dev-mode' });
    }
    
    try {
        
        const attemptData = await rateLimit.getLoginAttempts(clientIp);
        
        if (attemptData && attemptData.count >= config.MAX_LOGIN_ATTEMPTS) {
            const now = Date.now();
            if (now < attemptData.lockoutUntil) {
                const remainingTime = Math.ceil((attemptData.lockoutUntil - now) / 1000);
                const minutes = Math.floor(remainingTime / 60);
                const seconds = remainingTime % 60;
                return res.status(429).json({ 
                    success: false, 
                    error: `Too many failed attempts. Try again in ${minutes}m ${seconds}s`,
                    lockedOut: true,
                    retryAfter: remainingTime
                });
            } else {
                // Lockout expired, clear it
                await rateLimit.clearLoginAttempts(clientIp);
            }
        }
        
        // Wrong password
        if (password !== config.HISTORY_PASSWORD) {
            const currentAttempts = await rateLimit.getLoginAttempts(clientIp);
            currentAttempts.count = (currentAttempts.count || 0) + 1;
            
            if (currentAttempts.count >= config.MAX_LOGIN_ATTEMPTS) {
                currentAttempts.lockoutUntil = Date.now() + config.LOCKOUT_DURATION;
            }
            
            await rateLimit.setLoginAttempts(clientIp, currentAttempts);
            
            const attemptsRemaining = config.MAX_LOGIN_ATTEMPTS - currentAttempts.count;
            
            // Add delay to slow down attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (currentAttempts.count >= config.MAX_LOGIN_ATTEMPTS) {
                return res.status(429).json({ 
                    success: false, 
                    error: 'Too many failed attempts. Locked out for 3 minutes.',
                    lockedOut: true,
                    retryAfter: config.LOCKOUT_DURATION_SECONDS
                });
            } else {
                return res.status(401).json({ 
                    success: false, 
                    error: `Invalid password. ${attemptsRemaining} attempts remaining.`
                });
            }
        }
        
        // Successful login - clear any failed attempts
        await rateLimit.clearLoginAttempts(clientIp);
        
        // Generate secure session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        
        // Store session
        session.createSession(sessionToken);
        
        return res.json({ 
            success: true, 
            sessionToken,
            expiresIn: config.SESSION_EXPIRY / 1000
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Server error during authentication'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', (req, res) => {
    const sessionToken = req.headers['x-session-token'];
    if (sessionToken) {
        session.deleteSession(sessionToken);
    }
    res.json({ success: true });
});

module.exports = router;
