const NodeShield = require('../shield');

describe('NodeShield - Attack Detection Engine', () => {
  let shield;

  beforeEach(() => {
    shield = new NodeShield();
  });

  describe('SQL Injection Detection', () => {
    it('should detect UNION-based SQL injection', () => {
      const result = shield.detectSQLInjection("' UNION SELECT 1,2,3--");
      expect(result).toBe(true);
    });

    it('should detect classic SQL injection with OR', () => {
      const result = shield.detectSQLInjection("admin' OR '1'='1");
      expect(result).toBe(true);
    });

    it('should detect SQL injection with comments', () => {
      const result = shield.detectSQLInjection("'; DROP TABLE users; --");
      expect(result).toBe(true);
    });

    it('should detect SQL injection with semicolon', () => {
      const result = shield.detectSQLInjection("email@example.com; DELETE FROM users");
      expect(result).toBe(true);
    });

    it('should pass normal queries', () => {
      const result = shield.detectSQLInjection('John Smith');
      expect(result).toBe(false);
    });

    it('should pass email addresses', () => {
      const result = shield.detectSQLInjection('user@example.com');
      expect(result).toBe(false);
    });
  });

  describe('RCE Detection', () => {
    it('should detect eval() function calls', () => {
      const result = shield.detectRCE("eval('malicious code')");
      expect(result).toBe(true);
    });

    it('should detect require() calls', () => {
      const result = shield.detectRCE("require('child_process')");
      expect(result).toBe(true);
    });

    it('should detect child_process module', () => {
      const result = shield.detectRCE("child_process.exec('whoami')");
      expect(result).toBe(true);
    });

    it('should detect exec() function', () => {
      const result = shield.detectRCE('exec("ls -la")');
      expect(result).toBe(true);
    });

    it('should pass normal function calls', () => {
      const result = shield.detectRCE('Math.floor(3.14)');
      expect(result).toBe(false);
    });
  });

  describe('Path Traversal Detection', () => {
    it('should detect ../ sequences', () => {
      const result = shield.detectPathTraversal('../../etc/passwd');
      expect(result).toBe(true);
    });

    it('should detect .. sequences', () => {
      const result = shield.detectPathTraversal('../config.php');
      expect(result).toBe(true);
    });

    it('should detect multiple directory traversals', () => {
      const result = shield.detectPathTraversal('../../../../../../../etc/shadow');
      expect(result).toBe(true);
    });

    it('should pass normal file paths', () => {
      const result = shield.detectPathTraversal('documents/file.pdf');
      expect(result).toBe(false);
    });

    it('should pass absolute paths', () => {
      const result = shield.detectPathTraversal('/home/user/document.txt');
      expect(result).toBe(false);
    });
  });

  describe('XSS Detection', () => {
    it('should detect script tags', () => {
      const result = shield.detectXSS('<script>alert("XSS")</script>');
      expect(result).toBe(true);
    });

    it('should detect event handlers', () => {
      const result = shield.detectXSS('<img src=x onerror="alert(1)">');
      expect(result).toBe(true);
    });

    it('should detect javascript protocol', () => {
      const result = shield.detectXSS('javascript:alert("XSS")');
      expect(result).toBe(true);
    });

    it('should detect iframe injections', () => {
      const result = shield.detectXSS('<iframe src="evil.com"></iframe>');
      expect(result).toBe(true);
    });

    it('should pass normal text content', () => {
      const result = shield.detectXSS('This is a normal comment');
      expect(result).toBe(false);
    });

    it('should pass code snippets in context', () => {
      const result = shield.detectXSS('Use <tag> in HTML');
      expect(result).toBe(false);
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect pipe operator', () => {
      const result = shield.detectCommandInjection('ls -la | grep root');
      expect(result).toBe(true);
    });

    it('should detect ampersand operator', () => {
      const result = shield.detectCommandInjection('command1 & command2');
      expect(result).toBe(true);
    });

    it('should detect backtick injection', () => {
      const result = shield.detectCommandInjection('`whoami`');
      expect(result).toBe(true);
    });

    it('should detect dollar injection', () => {
      const result = shield.detectCommandInjection('$(whoami)');
      expect(result).toBe(true);
    });

    it('should detect semicolon separator', () => {
      const result = shield.detectCommandInjection('ls; cat /etc/passwd');
      expect(result).toBe(true);
    });

    it('should pass normal commands', () => {
      const result = shield.detectCommandInjection('ls /home/user');
      expect(result).toBe(false);
    });
  });

  describe('NoSQL Injection Detection', () => {
    it('should detect MongoDB operators', () => {
      const result = shield.detectNoSQLInjection('{"$ne": null}');
      expect(result).toBe(true);
    });

    it('should detect $where operator', () => {
      const result = shield.detectNoSQLInjection('{"$where": "this.age > 18"}');
      expect(result).toBe(true);
    });

    it('should detect JavaScript in NoSQL', () => {
      const result = shield.detectNoSQLInjection('{"$gt": ""}');
      expect(result).toBe(true);
    });

    it('should pass normal JSON', () => {
      const result = shield.detectNoSQLInjection('{"name": "John", "age": 30}');
      expect(result).toBe(false);
    });
  });

  describe('XXE Detection', () => {
    it('should detect DOCTYPE declarations', () => {
      const result = shield.detectXXE('<!DOCTYPE foo [<!ENTITY xxe "value">]>');
      expect(result).toBe(true);
    });

    it('should detect ENTITY declarations', () => {
      const result = shield.detectXXE('<!ENTITY xxe SYSTEM "file:///etc/passwd">');
      expect(result).toBe(true);
    });

    it('should detect XML entity references', () => {
      const result = shield.detectXXE('&xxe;');
      expect(result).toBe(true);
    });

    it('should pass normal XML', () => {
      const result = shield.detectXXE('<root><item>value</item></root>');
      expect(result).toBe(false);
    });
  });

  describe('LDAP Injection Detection', () => {
    it('should detect asterisk wildcard', () => {
      const result = shield.detectLDAPInjection('*');
      expect(result).toBe(true);
    });

    it('should detect LDAP filter syntax', () => {
      const result = shield.detectLDAPInjection('*)(uid=*');
      expect(result).toBe(true);
    });

    it('should detect OR filter', () => {
      const result = shield.detectLDAPInjection('*)(|(uid=*');
      expect(result).toBe(true);
    });

    it('should pass normal usernames', () => {
      const result = shield.detectLDAPInjection('john.doe');
      expect(result).toBe(false);
    });
  });

  describe('Severity Calculation', () => {
    it('should mark RCE as CRITICAL', () => {
      const severity = shield.calculateSeverity('RCE');
      expect(severity).toBe('CRITICAL');
    });

    it('should mark XXE as HIGH', () => {
      const severity = shield.calculateSeverity('XXE');
      expect(severity).toBe('HIGH');
    });

    it('should mark SQL Injection as HIGH', () => {
      const severity = shield.calculateSeverity('SQL Injection');
      expect(severity).toBe('HIGH');
    });

    it('should mark Path Traversal as MEDIUM', () => {
      const severity = shield.calculateSeverity('Path Traversal');
      expect(severity).toBe('MEDIUM');
    });

    it('should mark XSS as LOW', () => {
      const severity = shield.calculateSeverity('XSS');
      expect(severity).toBe('LOW');
    });

    it('should default unknown types to MEDIUM', () => {
      const severity = shield.calculateSeverity('Unknown Attack');
      expect(severity).toBe('MEDIUM');
    });
  });

  describe('Attack Logging', () => {
    it('should create attack record with correct structure', () => {
      shield.logAttack('SQL Injection', '/search', "' UNION SELECT 1--", {}, '192.168.1.1');
      expect(shield.inMemoryAttacks.length).toBe(1);

      const attack = shield.inMemoryAttacks[0];
      expect(attack.type).toBe('SQL Injection');
      expect(attack.endpoint).toBe('/search');
      expect(attack.severity).toBe('HIGH');
      expect(attack.ip).toBe('192.168.1.1');
      expect(attack.blocked).toBe(true);
    });

    it('should truncate payload to 200 characters', () => {
      const longPayload = 'x'.repeat(300);
      shield.logAttack('RCE', '/test', longPayload, {}, '127.0.0.1');

      const attack = shield.inMemoryAttacks[0];
      expect(attack.payload.length).toBeLessThanOrEqual(200);
    });

    it('should track IP rates', () => {
      shield.logAttack('XSS', '/test', '<script>', {}, '10.0.0.1');
      shield.logAttack('XSS', '/test', '<script>', {}, '10.0.0.1');
      shield.logAttack('SQL Injection', '/test', "' OR '1'='1", {}, '10.0.0.1');

      expect(shield.ipRates['10.0.0.1'].count).toBe(3);
      expect(shield.ipRates['10.0.0.1'].types['XSS']).toBe(2);
      expect(shield.ipRates['10.0.0.1'].types['SQL Injection']).toBe(1);
    });
  });

  describe('In-Memory Storage', () => {
    it('should store attacks in memory when DB is not configured', () => {
      shield.logAttack('RCE', '/cmd', 'eval("code")', {}, '127.0.0.1');
      shield.logAttack('XSS', '/form', '<script>', {}, '127.0.0.1');

      expect(shield.inMemoryAttacks.length).toBe(2);
    });

    it('should track attack counter', () => {
      for (let i = 0; i < 5; i++) {
        shield.logAttack('XSS', '/test', '<script>', {}, '127.0.0.1');
      }

      expect(shield.attackCounter).toBe(5);
      expect(shield.inMemoryAttacks[4].num).toBe(5);
    });
  });
});
