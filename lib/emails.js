// Email templates: one notification to Byte County, one auto-reply to the visitor (EN/ES).
// Inline styles only — email clients ignore <style> blocks and external CSS.

const NAVY = '#0B247A';
const SKY = '#27B7E8';
const INK = '#111827';
const MUTED = '#475569';

const SERVICE_LABELS = {
  en: {
    managed: 'Managed IT',
    support: 'IT Support',
    security: 'Cybersecurity',
    backup: 'Backup & Disaster Recovery',
    cloud: 'Cloud Services',
    network: 'Network & Infrastructure',
    unsure: 'Not sure yet',
    '': 'Not specified',
  },
  es: {
    managed: 'TI Administrada',
    support: 'Soporte de TI',
    security: 'Ciberseguridad',
    backup: 'Respaldo y Recuperación ante Desastres',
    cloud: 'Servicios en la Nube',
    network: 'Redes e Infraestructura',
    unsure: 'Aún no estoy seguro',
    '': 'No especificado',
  },
};

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F5F8FC;font-family:Arial,Helvetica,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F8FC;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d6deea;">
        <tr><td style="background:${NAVY};padding:20px 28px;">
          <span style="font-size:22px;font-weight:bold;letter-spacing:1px;color:${SKY};">BYTE</span><span style="font-size:22px;font-weight:bold;letter-spacing:1px;color:#ffffff;"> COUNTY</span>
        </td></tr>
        <tr><td style="height:4px;background:${SKY};line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:${NAVY};">${esc(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#F5F8FC;font-size:12px;color:${MUTED};">
          Byte County · 37 N Orange Ave. #1240, Orlando, FL 32801 · +1 407-988-1320 · contact@bytecounty.us
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label, value) {
  return `<tr>
    <td width="110" style="width:110px;padding:8px 12px 8px 0;vertical-align:top;font-size:14px;color:${MUTED};white-space:nowrap;">${esc(label)}</td>
    <td style="padding:8px 0;vertical-align:top;font-size:14px;color:${INK};">${value}</td>
  </tr>`;
}

/** Notification sent to Byte County (always in English). */
export function notificationEmail(d) {
  const service = SERVICE_LABELS.en[d.service] ?? d.service;
  const language = d.lang === 'es' ? 'Spanish' : 'English';
  const subject = `New consultation request — ${d.name}${d.company ? ` (${d.company})` : ''}`;

  const html = layout(
    'New consultation request',
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${row('Name', esc(d.name))}
      ${row('Company', esc(d.company || '—'))}
      ${row('Email', `<a href="mailto:${esc(d.email)}" style="color:${NAVY};">${esc(d.email)}</a>`)}
      ${row('Phone', d.phone ? `<a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}" style="color:${NAVY};">${esc(d.phone)}</a>` : '—')}
      ${row('Service', esc(service))}
      ${row('Language', language)}
    </table>
    <h2 style="margin:24px 0 8px;font-size:15px;color:${NAVY};">Message</h2>
    <div style="padding:14px 16px;background:#F5F8FC;border-radius:8px;font-size:14px;line-height:1.6;">${d.message ? nl2br(d.message) : '<em>No message</em>'}</div>`,
  );

  const text = [
    'New consultation request',
    '',
    `Name: ${d.name}`,
    `Company: ${d.company || '—'}`,
    `Email: ${d.email}`,
    `Phone: ${d.phone || '—'}`,
    `Service: ${service}`,
    `Language: ${language}`,
    '',
    'Message:',
    d.message || '(no message)',
  ].join('\n');

  return { subject, html, text };
}

const AUTO_REPLY = {
  en: {
    subject: 'We received your consultation request — Byte County',
    title: (name) => `Thanks, ${name}!`,
    p1: "We received your consultation request and a member of our team will be in touch soon to learn more about your business and schedule a time to talk.",
    p2: 'If you need to reach us sooner, call us at +1 407-988-1320.',
    summary: 'Your request',
    service: 'Service',
    message: 'Message',
    sign: '— The Byte County team',
  },
  es: {
    subject: 'Recibimos tu solicitud de consulta — Byte County',
    title: (name) => `¡Gracias, ${name}!`,
    p1: 'Recibimos tu solicitud de consulta. Un miembro de nuestro equipo te contactará pronto para conocer más sobre tu empresa y agendar un momento para hablar.',
    p2: 'Si necesitas comunicarte antes, llámanos al +1 407-988-1320.',
    summary: 'Tu solicitud',
    service: 'Servicio',
    message: 'Mensaje',
    sign: '— El equipo de Byte County',
  },
};

/** Confirmation sent to the visitor, in the language they used on the site. */
export function autoReplyEmail(d) {
  const c = AUTO_REPLY[d.lang] || AUTO_REPLY.en;
  const service = SERVICE_LABELS[d.lang]?.[d.service] ?? d.service;
  const firstName = d.name.split(' ')[0];

  const html = layout(
    c.title(firstName),
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${esc(c.p1)}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${esc(c.p2)}</p>
    <h2 style="margin:0 0 8px;font-size:15px;color:${NAVY};">${esc(c.summary)}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${row(c.service, esc(service))}
      ${d.message ? row(c.message, nl2br(d.message)) : ''}
    </table>
    <p style="margin:24px 0 0;font-size:15px;">${esc(c.sign)}</p>`,
  );

  const text = [
    c.title(firstName),
    '',
    c.p1,
    '',
    c.p2,
    '',
    `${c.service}: ${service}`,
    d.message ? `${c.message}: ${d.message}` : '',
    '',
    c.sign,
  ].join('\n');

  return { subject: c.subject, html, text };
}
