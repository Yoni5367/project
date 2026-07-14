const winston = require('winston');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'debale-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    ),
  }));
}

// Security event logger
const security = {
  loginFailed: (email, ip) => logger.warn('Login failed', { event: 'LOGIN_FAILED', email, ip }),
  loginSuccess: (userId, ip) => logger.info('Login success', { event: 'LOGIN_SUCCESS', userId, ip }),
  unauthorized: (userId, route, ip) => logger.warn('Unauthorized access', { event: 'UNAUTHORIZED', userId, route, ip }),
  rateLimited: (ip, route) => logger.warn('Rate limited', { event: 'RATE_LIMITED', ip, route }),
  adminAction: (adminId, action, target) => logger.warn('Admin action', { event: 'ADMIN_ACTION', adminId, action, target }),
  paymentBypass: (userId, plan) => logger.warn('Payment bypass', { event: 'PAYMENT_BYPASS', userId, plan }),
  passwordReset: (email, ip) => logger.info('Password reset requested', { event: 'PASSWORD_RESET', email, ip }),
  uploadSuspicious: (userId, bucket, ip) => logger.warn('Suspicious upload', { event: 'UPLOAD_SUSPICIOUS', userId, bucket, ip }),
};

module.exports = { logger, security };
