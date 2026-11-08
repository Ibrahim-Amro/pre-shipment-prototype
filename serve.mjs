import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const address = 'http://127.0.0.1:4173';
const openOnStart = process.argv.includes('--open');
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.jpg':'image/jpeg',
  '.png':'image/png', '.woff2':'font/woff2', '.json':'application/json', '.txt':'text/plain; charset=utf-8'
};

function openBrowser() {
  console.log('Pre-Shipment: ' + address);
  if (!openOnStart) return;
  const [program, args] = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', address]]
    : process.platform === 'darwin' ? ['open', [address]] : ['xdg-open', [address]];
  const opener = spawn(program, args, {windowsHide:true, detached:true, stdio:'ignore'});
  opener.on('error', () => console.log('Open ' + address + ' in your browser.'));
  opener.unref();
}

const server = http.createServer(async (req, res) => {
  function reply(code, message) {
    res.writeHead(code, {'Content-Type':'text/plain; charset=utf-8'});
    res.end(message);
  }
  if (!['GET','HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return reply(405, 'Method not allowed');
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, address).pathname);
  } catch {
    return reply(400, 'Bad request');
  }
  if (/[\u0000-\u001f\\:]/.test(pathname)) return reply(400, 'Invalid path');
  const target = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  const relative = path.relative(root, target);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    return reply(403, 'Forbidden');
  }
  try {
    const data = await fs.readFile(target);
    res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream',
      'Content-Length':data.length, 'Cache-Control':'no-cache'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    reply(404, 'Not found');
  }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    // Reuse the same prototype if the launcher was opened twice.
    try {
      const response = await fetch(address + '/app.js', {signal:AbortSignal.timeout(2000)});
      const local = await fs.readFile(path.join(root, 'app.js'), 'utf8');
      if (response.ok && await response.text() === local) {
        openBrowser();
        return;
      }
    } catch { /* Report the occupied port below. */ }
    console.error('Port 4173 is in use by another application. Close it and run the launcher again.');
  } else console.error(error.message);
  process.exitCode = 1;
});
server.listen(4173, '127.0.0.1', openBrowser);
