# Node Shield Logging System

## Overview

Node Shield includes a comprehensive logging system with support for multiple log levels, file rotation, and structured output formats.

## Configuration

Logging is configured via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Minimum log level: DEBUG, INFO, WARN, ERROR, CRITICAL |
| `LOG_FORMAT` | `json` | Output format: `json` or `text` |
| `LOG_DIR` | `./logs` | Directory for log files |
| `LOG_MAX_SIZE` | `10485760` | Max file size before rotation (bytes, default 10MB) |
| `LOG_MAX_FILES` | `7` | Number of log files to keep before deletion |

## Log Levels

Logs are categorized by severity:

- **DEBUG** (0): Detailed diagnostic information, low-level tracing
- **INFO** (1): General informational messages, normal operations
- **WARN** (2): Warning messages for potentially problematic situations
- **ERROR** (3): Error messages for failures that need attention
- **CRITICAL** (4): Critical errors requiring immediate action (security incidents)

Example with `LOG_LEVEL=WARN`: only WARN, ERROR, and CRITICAL messages are logged.

## Log Format

### JSON Format (default)

```json
{
  "timestamp": "2026-09-27T14:30:45.123Z",
  "level": "INFO",
  "service": "node-shield",
  "message": "Attack detected: SQL Injection",
  "data": {
    "type": "SQL Injection",
    "ip": "192.168.1.100",
    "severity": "HIGH"
  }
}
```

### Text Format

```
[2026-09-27T14:30:45.123Z] [INFO] Attack detected: SQL Injection {"type":"SQL Injection","ip":"192.168.1.100","severity":"HIGH"}
```

## File Rotation

Logs are automatically rotated based on:

1. **Daily rotation**: New log file created each day (format: `node-shield-YYYY-MM-DD.log`)
2. **Size-based rotation**: When a log file exceeds `LOG_MAX_SIZE`, it's renamed with a timestamp suffix
3. **Retention**: Old log files are automatically deleted, keeping only the last `LOG_MAX_FILES` files

### Rotation Example

```
logs/
├── node-shield-2026-09-27.log        (current)
├── node-shield-2026-09-26.log        (yesterday)
├── node-shield-2026-09-25.log
├── node-shield-2026-09-24.log
├── node-shield-2026-09-23.log
├── node-shield-2026-09-22.log
└── node-shield-2026-09-21.log        (oldest, 7 days)
```

## Usage Examples

### Development with Console Output

```bash
# Enable DEBUG logs, text format, console only
LOG_LEVEL=DEBUG LOG_FORMAT=text npm start
```

### Production with File Logging

```bash
# INFO level, JSON format, 10MB files, keep 30 days
LOG_LEVEL=INFO \
LOG_FORMAT=json \
LOG_DIR=/var/log/node-shield \
LOG_MAX_SIZE=10485760 \
LOG_MAX_FILES=30 \
npm start
```

### Docker Compose

```yaml
environment:
  LOG_LEVEL: INFO
  LOG_FORMAT: json
  LOG_DIR: /app/logs
  LOG_MAX_FILES: 14  # 2 weeks
volumes:
  - ./logs:/app/logs  # Persist logs outside container
```

## Programmatic Usage

### Basic Logging

```javascript
const Logger = require('./logger');

const logger = new Logger({
  logDir: './logs',
  logLevel: 'INFO',
  logFormat: 'json',
  serviceName: 'my-app'
});

logger.debug('Detailed info', { userId: 123 });
logger.info('User login', { ip: '192.168.1.1' });
logger.warn('Rate limit approaching', { requests: 95 });
logger.error('Database connection failed', { error: 'ECONNREFUSED' }, err);
logger.critical('Security breach detected', { type: 'SQL Injection', ip: '10.0.0.50' });
```

### Changing Log Level at Runtime

```javascript
logger.setLogLevel('DEBUG');  // Start logging DEBUG messages
logger.setLogLevel(2);         // Or use numeric level
```

### Getting Log File Path

```javascript
const logPath = logger.getLogPath();
console.log(`Logs are written to: ${logPath}`);
```

## Attack Logging Examples

### SQL Injection Detection

```json
{
  "timestamp": "2026-09-27T14:30:45.123Z",
  "level": "WARN",
  "service": "shield",
  "message": "Attack detected: SQL Injection",
  "data": {
    "type": "SQL Injection",
    "ip": "203.0.113.45",
    "severity": "HIGH",
    "endpoint": "/search"
  }
}
```

### Rate Limited Attack

```json
{
  "timestamp": "2026-09-27T14:31:12.456Z",
  "level": "CRITICAL",
  "service": "shield",
  "message": "Rate limited attack detected",
  "data": {
    "type": "XSS",
    "ip": "198.51.100.22",
    "count": 18
  }
}
```

## Monitoring Logs

### View Real-Time Logs

```bash
# Follow current log file
tail -f logs/node-shield-$(date +%Y-%m-%d).log

# Filter for errors only
grep "ERROR\|CRITICAL" logs/*.log
```

### Parse JSON Logs

```bash
# Extract all CRITICAL events
cat logs/*.log | jq 'select(.level=="CRITICAL")'

# Get attack types and IPs
cat logs/*.log | jq -r 'select(.data.type) | "\(.data.type) from \(.data.ip)"'
```

### Archive Old Logs

```bash
# Compress logs older than 30 days
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Delete logs older than 90 days
find logs/ -name "*.log.gz" -mtime +90 -delete
```

## Best Practices

1. **Use appropriate log levels**: DEBUG for development, INFO for production
2. **Enable file logging in production**: Ensure `LOG_DIR` is on persistent storage
3. **Monitor critical events**: Set up alerts for CRITICAL and ERROR level logs
4. **Rotate logs regularly**: Configure `LOG_MAX_FILES` based on storage capacity
5. **Centralize logs**: Export logs to a centralized logging service (e.g., ELK, Datadog)
6. **Include context**: Pass relevant data objects to log methods for better debugging

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` setting (higher threshold = fewer logs)
2. Verify `LOG_DIR` directory exists and is writable
3. Check file permissions: `ls -la logs/`

### Disk Space Issues

1. Reduce `LOG_MAX_FILES` to keep fewer log files
2. Reduce `LOG_MAX_SIZE` to rotate files more frequently
3. Enable compression: `find logs -name "*.log" -mtime +7 -exec gzip {} \;`
4. Use external logging service instead of local files

### Performance Impact

1. Reduce log level to avoid excessive I/O
2. Use text format instead of JSON for faster writes
3. Consider external logging service for high-volume deployments

## Integration with Monitoring

### Export to Syslog

```bash
# Pipe logs to syslog
tail -f logs/node-shield-*.log | logger -t node-shield
```

### Export to ELK Stack

```bash
# Filebeat configuration example
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/node-shield-*.log
  json.message_key: message
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "node-shield-%{+yyyy.MM.dd}"
```
