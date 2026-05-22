export const DOCS = [
  { slug: 'whatsapp', title: 'WhatsApp System Design', icon: '💬', file: '/content/whatsapp.md', desc: 'Complete deep-dive covering architecture, real-time messaging, scalability, fault tolerance, and 40+ design decisions.' },
  { slug: 'uber', title: 'Uber System Design', icon: '🚗', file: '/content/uber.md', desc: 'Ride-hailing platform design: GPS tracking, ride matching, surge pricing, payment processing, and distributed storage.' },
];

export const DOC_MAP = Object.fromEntries(DOCS.map(d => [d.slug, d]));
