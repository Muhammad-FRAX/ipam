const http = require('http');

const data = JSON.stringify({ name: 'HQ Region', cidr: '10.0.0.0/8' });

const options = {
  hostname: 'localhost',
  port: 3004,
  path: '/api/ipam/blocks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
