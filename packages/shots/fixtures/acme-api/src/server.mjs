import { createServer } from 'node:http';

const orders = new Map([['1001', { id: '1001', status: 'shipped' }]]);

createServer((req, res) => {
  if (req.url === '/health') return res.end('ok');
  const match = req.url?.match(/^\/orders\/(\w+)$/);
  const order = match && orders.get(match[1]);
  if (!order) return res.writeHead(404).end('not found');
  res.setHeader('content-type', 'application/json').end(JSON.stringify(order));
}).listen(8080);
