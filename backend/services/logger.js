const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (e) {
    console.log('Could not create logs directory:', e.message);
}

// Define log format
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// Build transports array - only add file transports if we can write
const logTransports = [
    new transports.Console({
        format: format.combine(
            format.colorize({ all: true }),
            logFormat
        )
    })
];

// Add file transports only if logs directory is writable
try {
    fs.accessSync(logsDir, fs.constants.W_OK);
    logTransports.push(
        new transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    );
} catch (e) {
    console.log('File logging disabled - logs directory not writable');
}

// Create logger instance
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: logTransports
});

// Stream for Morgan (if using Express HTTP logging)
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger;
