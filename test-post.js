const https = require('https');

const data = JSON.stringify({ name: 'HQ Region', cidr: '10.0.0.0/8' });

const options = {
  hostname: 'localhost',
  port: 443,
  path: '/api/ipam/blocks',
  method: 'POST',
  rejectUnauthorized: false,
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', (d) => { responseBody += d; });
  res.on('end', () => console.log('Response:', responseBody));
});

req.on('error', (error) => console.error('Error:', error));
req.write(data);
req.end();
