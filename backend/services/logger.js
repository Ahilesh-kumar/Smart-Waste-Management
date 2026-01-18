const { createLogger, format, transports } = require('winston');
const path = require('path');

// Define log format
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// Create logger instance
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console transport (colorized for dev)
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                logFormat
            )
        }),
        // File transport for errors
        new transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(__dirname, '../logs/exceptions.log') })
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(__dirname, '../logs/rejections.log') })
    ]
});

// Stream for Morgan (if using Express HTTP logging)
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger;
