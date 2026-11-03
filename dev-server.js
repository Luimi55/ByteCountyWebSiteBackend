// Local test server — mimics Vercel by routing /api/<name> to api/<name>.js.
// Run with `npm run dev` (loads .env). Not used in production.
import http from 'node:http';

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/i);
  if (!match) {
    res.statusCode = 404;
    return res.end('Not found');
  }

  let mod;
  try {
    mod = await import(`./api/${match[1]}.js`);
  } catch {
    res.statusCode = 404;
    return res.end('Not found');
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    req.body = raw && req.headers['content-type']?.includes('application/json') ? JSON.parse(raw) : raw;
  } catch {
    req.body = raw;
  }

  await mod.default(req, res);
});

server.listen(PORT, () => {
  console.log(`API dev server on http://localhost:${PORT}  (dry run: ${process.env.MAIL_DRY_RUN === 'true'})`);
});
