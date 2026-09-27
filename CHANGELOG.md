# Changelog

All notable changes to Node Shield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-27

### Added
- MIT LICENSE file
- npm configuration with proper metadata
- Environment setup documentation
- Database migration system
- Project structure documentation
- Security review documentation
- API documentation
- Deployment guide
- Docker support with docker-compose
- CLI tool for stats, attacks, reset, and export
- Dashboard HTML interface (AS400Pro theme)
- PostgreSQL support with connection pooling
- In-memory fallback for standalone development

### Changed
- Improved attack detection patterns for 8 attack types
- Enhanced severity classification logic
- Optimized IP rate limiting tracking

### Fixed
- Database failover handling
- Migration script error handling

## [0.1.0] - 2026-09-25

### Added
- Initial project setup
- Core NodeShield class with attack detection
- Support for 8 attack types:
  - SQL Injection
  - Remote Code Execution (RCE)
  - Path Traversal
  - Command Injection
  - Cross-Site Scripting (XSS)
  - NoSQL Injection
  - XML External Entity (XXE)
  - LDAP Injection
- Basic HTTP server (app-standalone.js)
- Express.js middleware example
- Attack logging with metadata
- IP-based rate limiting
- Basic test suite

---

## Unreleased

### Planned Features
- [ ] Real-time WebSocket dashboard updates
- [ ] ML-based detection for reduced false positives
- [ ] Request body parameter scanning
- [ ] Automatic IP blocking/rate limiting
- [ ] Data retention policies with partitioning
- [ ] Dashboard authentication
- [ ] Advanced filtering and search
- [ ] Export to SIEM systems
- [ ] Kubernetes Helm charts
