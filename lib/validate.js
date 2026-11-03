// Server-side validation for the consultation form. Never trust the browser's checks.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SERVICES = ['managed', 'support', 'security', 'backup', 'cloud', 'network', 'unsure', ''];

const LIMITS = { name: 120, company: 160, email: 254, phone: 40, message: 4000 };

// Fields that end up in email headers/subjects must be single-line.
const singleLine = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();
const multiLine = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim();

export function validateConsultation(body) {
  const data = {
    name: singleLine(body?.name),
    company: singleLine(body?.company),
    email: singleLine(body?.email).toLowerCase(),
    phone: singleLine(body?.phone),
    service: singleLine(body?.service),
    message: multiLine(body?.message),
    lang: body?.lang === 'es' ? 'es' : 'en',
  };

  const errors = {};
  if (!data.name) errors.name = 'required';
  if (!data.email) errors.email = 'required';
  else if (!EMAIL_RE.test(data.email)) errors.email = 'invalid';
  if (!SERVICES.includes(data.service)) errors.service = 'invalid';

  for (const [field, max] of Object.entries(LIMITS)) {
    if (data[field].length > max) errors[field] = 'too_long';
  }

  return { data, errors, ok: Object.keys(errors).length === 0 };
}
