import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const chatEndpoint = process.env.CHAT_ENDPOINT || 'https://vibe-proxy-gqv4.onrender.com/v1/chat/completions';
const chatApiKey = process.env.CHAT_API_KEY || 'sk-vibe-summer-2026';
const chatModel = process.env.CHAT_MODEL || 'class-chat-model';

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

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function safeParseJson(rawBody) {
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function createAgentInstruction(agentName, question) {
  return `You are the ${agentName} in a multi-agent mystery solving workflow. Provide a direct answer to the user question in 3-6 sentences, include concrete reasoning, and keep the tone concise. User question: ${question}`;
}

async function askModel(agentName, question) {
  const response = await fetch(chatEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${chatApiKey}`
    },
    body: JSON.stringify({
      model: chatModel,
      messages: [
        {
          role: 'user',
          content: createAgentInstruction(agentName, question)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'No response received from model.';
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url || '/';

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/api/orchestrate' && req.method === 'POST') {
    try {
      const rawBody = await readRequestBody(req);
      const payload = safeParseJson(rawBody);
      const question = payload?.question?.trim();
      const activeAgents = Array.isArray(payload?.activeAgents) ? payload.activeAgents : [];

      if (!question) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'A non-empty question is required.' }));
        return;
      }

      const outputs = [];
      const trace = [];

      for (const agent of activeAgents) {
        trace.push({ step: `${agent.name} processing`, agentId: agent.id, status: 'processing' });
        const answer = await askModel(agent.name, question);
        outputs.push({ agentId: agent.id, content: `${agent.name}: ${answer}` });
        trace.push({ step: `${agent.name} completed`, agentId: agent.id, status: 'success' });
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ prompt: question, outputs, trace }));
      return;
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Failed to orchestrate answers.', details: error.message }));
      return;
    }
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

server.listen(port, host, () => {
  const publicHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(`Dynamic orchestrator running on http://${publicHost}:${port} (bound to ${host})`);
});
