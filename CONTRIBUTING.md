# Contributing to Node Shield

First off, thank you for considering contributing to Node Shield! It's people like you that make Node Shield such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs if possible**
* **Include your environment details** (Node version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and the expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Follow the JavaScript style guide
* Include appropriate test cases
* Document new code with JSDoc comments
* End all files with a newline

## Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/node-shield.git
   cd node-shield
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Configure if using PostgreSQL
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Start development server**
   ```bash
   npm start
   ```

## Testing

All submissions should include tests. We use Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Writing Tests

* Test file locations: Tests should be in `__tests__/` directory or use `.test.js` suffix
* Test naming: Use descriptive names that explain what is being tested
* Coverage: Aim for at least 80% code coverage
* Example:
  ```javascript
  describe('NodeShield SQL Injection Detection', () => {
    it('should detect UNION-based SQL injection', () => {
      const shield = new NodeShield();
      const result = shield.detectSQLInjection("' UNION SELECT 1--");
      expect(result).toBe(true);
    });
  });
  ```

## Style Guide

### JavaScript Style

* Use 2 spaces for indentation
* Use single quotes for strings
* Use camelCase for variable names
* Use CONSTANT_CASE for constants
* Use descriptive variable names

### Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

Example:
```
Add SQL injection detection for UNION queries

- Implement pattern matching for UNION keyword
- Add test cases for various UNION syntax variations
- Update detection severity mapping

Fixes #123
```

### Documentation

* Keep README.md up to date
* Document public APIs with JSDoc
* Update CHANGELOG.md when adding features
* Include examples in documentation

## Database Migrations

When modifying the database schema:

1. Create a new migration file in `migrations/`:
   ```bash
   migrations/003_your_migration_name.sql
   ```

2. Write idempotent SQL (can be run multiple times safely)

3. Test the migration:
   ```bash
   npm run migrate
   ```

4. Document the changes in CHANGELOG.md

## Security

If you find a security vulnerability, **do not** open a public issue. Instead, please email [achmad.firdaus@example.com] with details of the vulnerability.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Feel free to open an issue with the label `question` or contact the maintainer directly.

## Recognition

Contributors will be recognized in the README.md and CHANGELOG.md. Thank you for your contributions!
