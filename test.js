const http = require('http');

const baseUrl = 'http://localhost:3000';

const testCases = [
  {
    name: 'SQL Injection Attack',
    url: '/search?q=admin\' UNION SELECT 1,2,3--',
    expected: 'SQL injection detected'
  },
  {
    name: 'RCE Attack',
    url: '/execute?cmd=require(\'child_process\').exec(\'ls\')',
    expected: 'RCE attempt detected'
  },
  {
    name: 'Path Traversal Attack',
    url: '/file?file=../../etc/passwd',
    expected: 'Path traversal detected'
  },
  {
    name: 'Normal Request (should pass)',
    url: '/search?q=admin',
    expected: 'results'
  }
];

async function runTests() {
  console.log('🧪 Running Node Shield Detection Tests\n');

  for (const test of testCases) {
    try {
      const response = await new Promise((resolve, reject) => {
        const options = new URL(baseUrl + test.url);
        http.get(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        }).on('error', reject);
      });

      const passed = JSON.stringify(response.data).includes(test.expected);
      const status = passed ? '✅' : '❌';

      console.log(`${status} ${test.name}`);
      console.log(`   Response: ${response.status} ${JSON.stringify(response.data).slice(0, 80)}`);
      console.log('');
    } catch (err) {
      console.log(`❌ ${test.name} - Error: ${err.message}\n`);
    }
  }
}

// Wait for server to start
setTimeout(runTests, 1000);
