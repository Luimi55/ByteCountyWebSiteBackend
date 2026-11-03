# Byte County — Website Backend

Serverless API for the Byte County website, deployed on **Vercel**. The website itself (`../ByteCountyWebSite`) is a static build hosted on the client's server.

## Endpoint

`POST /api/consultation`. It receives the consultation form and sends two emails through Gmail SMTP:

1. **Notification** to `MAIL_TO` (contact@bytecounty.us), in English.
2. **Auto-reply** to the visitor, in the language they used on the site (EN/ES).

Both are sent **from** `MAIL_FROM` (contact@bytecounty.us). SMTP login uses `SMTP_USER` (info@bytecounty.us).

| Response | Meaning |
|---|---|
| `200 {ok:true}` | Sent (bots also get this, silently dropped) |
| `422 {error:"validation", fields}` | Missing/invalid name or email |
| `429 {error:"rate_limited"}` | Too many requests from this IP |
| `403 {error:"origin_not_allowed"}` | Request didn't come from an allowed website |
| `502 {error:"send_failed"}` | SMTP error (check Vercel logs) |
| `500 {error:"server_not_configured"}` | Missing environment variables |

### Spam protection
- Hidden honeypot field (`website`).
- Minimum fill time (3 s), measured in the browser.
- Rate limit per IP (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MIN`). It's in memory, so it's best effort on serverless. If spam becomes a problem, add Cloudflare Turnstile.
- CORS: only origins listed in `ALLOWED_ORIGINS` can call the API.

## Local development

```bash
npm install
cp .env.example .env     # then edit .env
npm run dev              # http://localhost:3001/api/consultation
```

With `MAIL_DRY_RUN=true`, emails are built but **not sent**; the console prints what would be sent. To send real email locally, set `MAIL_DRY_RUN=false` and paste the Gmail App Password into `SMTP_PASS`.

Run the website with `npm run dev` in `../ByteCountyWebSite`. Its `.env.development` already points to this local API.

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (no build settings needed). Or run `npx vercel` from this folder.
2. In **Project → Settings → Environment Variables** (Production), add everything from `.env.example`:
   - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`
   - `SMTP_USER=info@bytecounty.us`
   - `SMTP_PASS=` the Gmail App Password
   - `MAIL_FROM=Byte County <contact@bytecounty.us>`
   - `MAIL_TO=contact@bytecounty.us`
   - `ALLOWED_ORIGINS=` the live site address(es), e.g. `https://bytecounty.us,https://www.bytecounty.us`
   - `MAIL_DRY_RUN=false`
3. Deploy, then copy the URL (e.g. `https://bytecounty-api.vercel.app`).
4. In the website, set `VITE_CONSULTATION_API_URL=https://<that-url>/api/consultation` in `.env.production`, run `npm run build`, and upload `dist/` to the client server.

## Gmail "Send mail as" check

Login is info@, but the sender is contact@. Gmail only keeps that sender if **contact@bytecounty.us is a verified "Send mail as" address** in the info@ account (Gmail → Settings → Accounts → *Send mail as*). If it isn't, emails still go out but show **info@** as the sender. After the first real test, check the From line of the received email.

**Status (2026-10-23):** contact@ is configured as "Send mail as" in info@, so emails show From: contact@.

### Notifications only appear in "Sent"
contact@ delivers into the info@ mailbox. Sending through info@'s SMTP to contact@ is therefore "mail to yourself", and Gmail may file it only under **Sent**. If that happens, send through something other than the info@ mailbox. Only the environment variables change, not the code:
- **Resend** (recommended): verify bytecounty.us in Resend, then `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`, `SMTP_PASS=<Resend API key>`.
- **Separate Workspace user** (e.g. forms@): add contact@ as "Send mail as" there, use its App Password.

## Secrets

- `.env` is git-ignored. Never commit the App Password or put it in the website code.
- If the App Password is ever shared in chat or email, revoke it and create a new one (Google Account → Security → App passwords), then update `SMTP_PASS` in Vercel.
