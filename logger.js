const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS);

class Logger {
  constructor(options = {}) {
    this.logDir = options.logDir || process.env.LOG_DIR || './logs';
    this.logLevel = this._parseLogLevel(options.logLevel || process.env.LOG_LEVEL || 'INFO');
    this.logFormat = options.logFormat || process.env.LOG_FORMAT || 'json';
    this.maxFileSize = options.maxFileSize || parseInt(process.env.LOG_MAX_SIZE || '10485760'); // 10MB default
    this.maxFiles = options.maxFiles || parseInt(process.env.LOG_MAX_FILES || '7'); // 7 days
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile !== false;
    this.serviceName = options.serviceName || 'node-shield';
    this.currentLogFile = null;
    this.fileSize = 0;

    this._ensureLogDirectory();
    this._initLogFile();
  }

  _parseLogLevel(level) {
    if (typeof level === 'number') return level;
    const parsed = LOG_LEVELS[String(level).toUpperCase()];
    return parsed !== undefined ? parsed : LOG_LEVELS.INFO;
  }

  _ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${this.serviceName}-${date}.log`);
  }

  _initLogFile() {
    if (!this.enableFile) return;

    const logFile = this._getLogFileName();
    if (logFile !== this.currentLogFile) {
      this.currentLogFile = logFile;
      this.fileSize = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
      this._cleanupOldLogs();
    }
  }

  _shouldRotate() {
    return this.fileSize > this.maxFileSize;
  }

  _rotateLog() {
    if (!this.enableFile) return;

    const timestamp = new Date().getTime();
    const backupFile = `${this.currentLogFile}.${timestamp}`;

    try {
      fs.renameSync(this.currentLogFile, backupFile);
      this.fileSize = 0;
      this._initLogFile();
    } catch (err) {
      console.error('[Logger] Failed to rotate log file:', err.message);
    }
  }

  _cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith(this.serviceName) && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          time: fs.statSync(path.join(this.logDir, f)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > this.maxFiles) {
        for (let i = this.maxFiles; i < files.length; i++) {
          try {
            fs.unlinkSync(files[i].path);
          } catch (err) {
            console.error(`[Logger] Failed to delete old log: ${files[i].name}`);
          }
        }
      }
    } catch (err) {
      console.error('[Logger] Cleanup failed:', err.message);
    }
  }

  _redactSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveKeys = new Set([
      'password', 'passwd', 'pwd',
      'api_key', 'apikey', 'api-key',
      'token', 'access_token', 'refresh_token', 'auth_token',
      'secret', 'client_secret', 'app_secret',
      'authorization', 'auth', 'bearer',
      'cookie', 'cookies', 'session', 'sessionid',
      'credit_card', 'creditcard', 'ccn', 'cvv',
      'ssn', 'social_security',
      'private_key', 'privatekey',
      'db_password', 'database_password',
      'jwt', 'signature',
      'credentials', 'credential',
      'username', 'user', 'email' // redact emails for privacy
    ]);

    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

    const redactValue = (val) => {
      if (val && typeof val === 'object') {
        return this._redactSensitiveData(val);
      }
      return '***REDACTED***';
    };

    for (const key in redacted) {
      if (redacted.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.has(lowerKey)) {
          redacted[key] = redactValue(redacted[key]);
        } else if (redacted[key] && typeof redacted[key] === 'object') {
          redacted[key] = this._redactSensitiveData(redacted[key]);
        }
      }
    }

    return redacted;
  }

  _formatLog(level, message, data, stack) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level] || 'UNKNOWN';
    const redactedData = data ? this._redactSensitiveData(data) : null;

    if (this.logFormat === 'json') {
      const entry = {
        timestamp,
        level: levelName,
        service: this.serviceName,
        message,
        ...(redactedData && Object.keys(redactedData).length > 0 && { data: redactedData }),
        ...(stack && { stack })
      };
      return JSON.stringify(entry);
    } else {
      let line = `[${timestamp}] [${levelName}] ${message}`;
      if (redactedData && Object.keys(redactedData).length > 0) {
        line += ` ${JSON.stringify(redactedData)}`;
      }
      if (stack) {
        line += `\n${stack}`;
      }
      return line;
    }
  }

  _log(level, message, data = {}, error = null) {
    if (level < this.logLevel) return;

    const stack = error && error.stack ? error.stack : null;
    const logLine = this._formatLog(level, message, data, stack);

    if (this.enableConsole) {
      console.log(logLine);
    }

    if (this.enableFile) {
      try {
        if (this._shouldRotate()) {
          this._rotateLog();
        }

        fs.appendFileSync(this.currentLogFile, logLine + '\n');
        this.fileSize += logLine.length + 1;
      } catch (err) {
        console.error('[Logger] Failed to write log:', err.message);
      }
    }
  }

  debug(message, data) {
    this._log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data) {
    this._log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data) {
    this._log(LOG_LEVELS.WARN, message, data);
  }

  error(message, data, error) {
    this._log(LOG_LEVELS.ERROR, message, data, error);
  }

  critical(message, data, error) {
    this._log(LOG_LEVELS.CRITICAL, message, data, error);
  }

  setLogLevel(level) {
    this.logLevel = this._parseLogLevel(level);
    this.info('Log level changed', { logLevel: LOG_LEVEL_NAMES[this.logLevel] });
  }

  getLogPath() {
    return this.currentLogFile;
  }
}

module.exports = Logger;
