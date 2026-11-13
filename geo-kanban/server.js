/* GEO 看板数据服务：静态页 + /api/data 读写 data.json（无第三方依赖） */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8100);
const HOST = '0.0.0.0';
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PAGE_FILE = path.join(ROOT, 'geo-kanban.html');
const MAX_BODY = 20 * 1024 * 1024;

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/api/data') {
    if (req.method === 'GET') {
      fs.readFile(DATA_FILE, 'utf8', (err, txt) => {
        if (err) return send(res, 200, 'application/json; charset=utf-8', '{}');
        send(res, 200, 'application/json; charset=utf-8', txt);
      });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => {
        body += c;
        if (body.length > MAX_BODY) req.destroy();
      });
      req.on('end', () => {
        try { JSON.parse(body); } catch (e) {
          return send(res, 400, 'application/json; charset=utf-8', '{"ok":false,"error":"invalid json"}');
        }
        const tmp = DATA_FILE + '.tmp';
        try {
          fs.writeFileSync(tmp, body);
          fs.renameSync(tmp, DATA_FILE);
          send(res, 200, 'application/json; charset=utf-8', '{"ok":true}');
        } catch (e) {
          send(res, 500, 'application/json; charset=utf-8', '{"ok":false,"error":"write failed"}');
        }
      });
      return;
    }
    send(res, 405, 'text/plain; charset=utf-8', 'method not allowed');
    return;
  }

  if (req.method !== 'GET') { send(res, 404, 'text/plain; charset=utf-8', 'not found'); return; }
  fs.readFile(PAGE_FILE, (err, buf) => {
    if (err) return send(res, 500, 'text/plain; charset=utf-8', 'page missing');
    send(res, 200, 'text/html; charset=utf-8', buf);
  });
});

server.listen(PORT, HOST, () => {
  console.log('geo-kanban server listening on http://' + HOST + ':' + PORT + '  data: ' + DATA_FILE);
});
