// POST /api/consultation — receives the website's consultation form and emails it.
// Vercel Node.js function. Uses plain res.* calls so it also runs under dev-server.js.

import { validateConsultation } from '../lib/validate.js';
import { clientIp, isRateLimited, looksLikeBot } from '../lib/spam.js';
import { getTransporter, missingConfig } from '../lib/mailer.js';
import { autoReplyEmail, notificationEmail } from '../lib/emails.js';

// Logs what the SMTP server answered (no message content), so delivery issues can be traced in Vercel logs.
const logSent = (kind, msg, info) => {
  if (process.env.MAIL_DRY_RUN === 'true') {
    console.log(`[dry-run] would send ${kind} "${msg.subject}" from ${msg.from} to ${msg.to}`);
    return;
  }
  console.log(
    `[consultation] ${kind} to ${msg.to}: accepted=${JSON.stringify(info?.accepted)} rejected=${JSON.stringify(info?.rejected)} ` +
      `response="${info?.response}" messageId=${info?.messageId}`,
  );
};

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = allowedOrigins();
  res.setHeader('Vary', 'Origin');
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return true;
  }
  return false;
}

async function readBody(req) {
  // Vercel pre-parses JSON into req.body; the local dev server does too.
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return {};
}

export default async function handler(req, res) {
  const originOk = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = originOk ? 204 : 403;
    return res.end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  if (!originOk) return send(res, 403, { ok: false, error: 'origin_not_allowed' });

  const missing = missingConfig();
  if (missing.length) {
    console.error('[consultation] missing environment variables:', missing.join(', '));
    return send(res, 500, { ok: false, error: 'server_not_configured' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return send(res, 400, { ok: false, error: 'invalid_json' });
  }

  // Bots get a fake success so they don't learn what tripped them.
  const bot = looksLikeBot(body);
  if (bot) {
    console.warn('[consultation] dropped as spam:', bot);
    return send(res, 200, { ok: true });
  }

  if (isRateLimited(clientIp(req))) {
    return send(res, 429, { ok: false, error: 'rate_limited' });
  }

  const { data, errors, ok } = validateConsultation(body);
  if (!ok) return send(res, 422, { ok: false, error: 'validation', fields: errors });

  const transporter = getTransporter();
  const from = process.env.MAIL_FROM;

  try {
    const note = notificationEmail(data);
    // Per client: sent from contact@ to contact@, no Reply-To.
    const msg = { from, to: process.env.MAIL_TO, subject: note.subject, html: note.html, text: note.text };
    logSent('notification', msg, await transporter.sendMail(msg));
  } catch (err) {
    console.error('[consultation] notification email failed:', err?.message || err);
    return send(res, 502, { ok: false, error: 'send_failed' });
  }

  // The request is already delivered; a failed confirmation shouldn't fail the form.
  try {
    const reply = autoReplyEmail(data);
    const msg = { from, to: data.email, subject: reply.subject, html: reply.html, text: reply.text };
    logSent('auto-reply', msg, await transporter.sendMail(msg));
  } catch (err) {
    console.error('[consultation] auto-reply failed:', err?.message || err);
  }

  return send(res, 200, { ok: true });
}
