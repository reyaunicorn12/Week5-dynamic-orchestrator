import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function resolveRequestFilePath(urlPath) {
  if (urlPath === '/' || urlPath === '/index.html') {
    return path.join(__dirname, 'public', 'index.html');
  }

  if (urlPath.startsWith('/src/')) {
    return path.join(__dirname, urlPath.slice(1));
  }

  if (urlPath.startsWith('/public/')) {
    return path.join(__dirname, urlPath.slice(1));
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url || '/';

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  try {
    const filePath = resolveRequestFilePath(urlPath);
    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const content = await readFile(filePath);
    const extension = path.extname(filePath);
    const contentType = contentTypes[extension] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Dynamic orchestrator running on http://localhost:${port}`);
});
