const autocannon = require('autocannon');

const tests = [
  {
    name: 'Signup (POST)',
    options: {
      url: 'http://localhost:5001/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: 'testuser' + Date.now() + '@example.com',
        password: 'TestPassword123'
      }),
      duration: 30,
      connections: 10,
      pipelining: 1
    }
  },
  {
    name: 'Login (POST)',
    options: {
      url: 'http://localhost:5001/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testuser@example.com', // Use a real user for meaningful results
        password: 'TestPassword123'
      }),
      duration: 30,
      connections: 10,
      pipelining: 1
    }
  },
  {
    name: 'Get Users (GET)',
    options: {
      url: 'http://localhost:5001/api/messages/users',
      method: 'GET',
      duration: 30,
      connections: 10,
      pipelining: 1
    }
  },
  {
    name: 'Get Messages (GET)',
    options: {
      url: 'http://localhost:5001/api/messages/6832b2287fc8fb583cb0814c', // Replace with a real userId
      method: 'GET',
      duration: 30,
      connections: 10,
      pipelining: 1
    }
  }
];

async function runTests() {
  for (const test of tests) {
    console.log('\n==============================================');
    console.log(`🚀 Running test: ${test.name}`);
    console.log('==============================================');
    await new Promise((resolve) => {
      autocannon(test.options, (err, result) => {
        if (err) {
          console.error('❌ Error:', err);
        } else {
          autocannon.printResult(result); // Prints a detailed result table
          console.log("Number of requests: ", result.requests.total)
          console.log("Duration (seconds): ", result.duration)
          console.log("Result: ", result)
        }
        console.log('==============================================\n');
        resolve();
      });
    });
  }
  console.log('\n✅ All tests completed.\n');
}

runTests();