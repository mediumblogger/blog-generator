'use strict'
class LoggerWrapper {

    constructor(loggerObj, details) {
        this.logger = loggerObj;
        this.details = details;
    }

    info(message) {
        this.details.duration = (this.details.start_time) ? (Date.now() - (this.details || {}).start_time) / 1000 : 0.0;
        this.logger.info(message, this.details);

    }
    warn(message) {
        this.details.duration = (this.details.start_time) ? (Date.now() - (this.details || {}).start_time) / 1000 : 0.0;
        this.logger.warn(message, this.details);
    }

    error(message) {
        this.details.duration = (this.details.start_time) ? (Date.now() - (this.details || {}).start_time) / 1000 : 0.0;
        this.logger.error(message, this.details);

    }
}
module.exports = LoggerWrapper;