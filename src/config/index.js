
module.exports = {
    PORT: process.env.PORT || 3000,
    WEBHOOK_URL: 'https://awad123612.app.n8n.cloud/webhook/google-assistant',
    HISTORY_USERNAME: process.env.HISTORY_USERNAME,
    HISTORY_PASSWORD: process.env.HISTORY_PASSWORD,
    AIO_USERNAME: process.env.AIO_USERNAME,
    AIO_KEY: process.env.AIO_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    
   
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
    
 
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 3 * 60 * 1000, // 3 minutes in ms
    LOCKOUT_DURATION_SECONDS: 180,   // 3 minutes in seconds
    SESSION_EXPIRY: 60 * 60 * 1000,  // 1 hour in ms
};
