var winston = require('winston');
var DailyRotateFile = require('winston-daily-rotate-file');

var config = {
    transports: [
                new DailyRotateFile({
                name: 'errorLogger',
                level: 'error',
                filename: 'error-',
                datePattern: 'yyyy-MM-dd_HH.log',
                json: false
                }),
                new DailyRotateFile({
                name: 'debugLogger',
                level: 'debug',
                filename: 'debug-',
                datePattern: 'yyyy-MM-dd_HH-mm.log',
                json: false
                })
    ]
};

var logger = new winston.Logger(config);

module.exports = logger;

//logger.log('debug', 'debug message');
//logger.log('error', 'error message');      // **중요**