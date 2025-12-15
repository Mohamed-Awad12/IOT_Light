const express = require('express');
const path = require('path');

// Config
const config = require('./src/config');

// Routes
const { authRoutes, controlRoutes, statusRoutes, historyRoutes } = require('./src/routes');

// Models (for cleanup tasks)
const { session, rateLimit } = require('./src/models');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/control', controlRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/history', historyRoutes);

// Cleanup expired sessions and rate limit entries every 10 minutes
setInterval(() => {
    session.cleanupExpiredSessions();
    rateLimit.cleanupExpiredAttempts();
}, 10 * 60 * 1000);

// Start server
app.listen(config.PORT, () => {
    console.log(`Server is running on http://localhost:${config.PORT}`);
});

module.exports = app;
