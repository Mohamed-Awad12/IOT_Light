const express = require('express');
const path = require('path');
const config = require('./src/config');
const { authRoutes, controlRoutes, statusRoutes, historyRoutes } = require('./src/routes');
const { session, rateLimit } = require('./src/models');

const app = express();


app.use(express.json());
app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/control', controlRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/history', historyRoutes);


if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    setInterval(() => {
        session.cleanupExpiredSessions();
        rateLimit.cleanupExpiredAttempts();
    }, 10 * 60 * 1000);
}


if (!process.env.VERCEL) {
    app.listen(config.PORT, () => {
        console.log(`Server is running on http://localhost:${config.PORT}`);
    });
}

module.exports = app;
