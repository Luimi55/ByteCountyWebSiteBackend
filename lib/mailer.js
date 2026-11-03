import nodemailer from 'nodemailer';

let transporter;

// SMTP auth uses SMTP_USER (info@), but messages are sent From MAIL_FROM (contact@).
// For Gmail to keep that From address, contact@ must be a verified "Send mail as"
// address in the info@ account; otherwise Gmail rewrites the sender to info@.
export function getTransporter() {
  if (transporter) return transporter;

  if (process.env.MAIL_DRY_RUN === 'true') {
    // Local testing: build the message but don't send anything.
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // 587 uses STARTTLS
    requireTLS: port !== 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export function missingConfig() {
  const required = ['MAIL_FROM', 'MAIL_TO'];
  if (process.env.MAIL_DRY_RUN !== 'true') required.push('SMTP_USER', 'SMTP_PASS');
  return required.filter((k) => !process.env[k]);
}
