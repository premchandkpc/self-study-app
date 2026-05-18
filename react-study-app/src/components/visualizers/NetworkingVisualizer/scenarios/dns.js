import { snap } from './shared';

function buildDnsSteps() {
  const steps = [];

  const makeNode = (id, label, type, cached = false) => ({
    id, label, type, cached, active: false, resolved: false,
  });

  const s = {
    domain: 'example.com',
    chain: [
      makeNode('browser', 'Browser Cache', 'cache'),
      makeNode('os', 'OS Cache', 'cache'),
      makeNode('resolver', 'Recursive Resolver\n8.8.8.8', 'resolver'),
      makeNode('root', 'Root NS\n(.)', 'nameserver'),
      makeNode('tld', 'TLD NS\n(.com)', 'nameserver'),
      makeNode('auth', 'Authoritative NS\nexample.com', 'nameserver'),
    ],
    result: null,
    events: [],
    metrics: { lookups: 0, cached: 0, ttl: 0 },
    vars: { domain: 'example.com', step: 'browser-cache', ttl: 300, cached: false },
    activeNode: null,
    packet: null,
  };

  snap(steps, s, 'DNS resolution: Browser needs IP for "example.com". Checks cache chain.', 1);

  // Browser cache miss
  s.chain[0].active = true;
  s.activeNode = 'browser';
  s.metrics.lookups++;
  s.events.push({ msg: 'Check browser DNS cache', type: 'info' });
  s.vars = { domain: 'example.com', step: 'browser-cache', ttl: 0, cached: false };
  snap(steps, s, 'Browser checks its DNS cache. TTL expired — cache miss.', 2);

  s.chain[0].active = false;
  s.chain[0].resolved = false;

  // OS cache miss
  s.chain[1].active = true;
  s.activeNode = 'os';
  s.metrics.lookups++;
  s.events.push({ msg: 'Check OS DNS cache (/etc/hosts, nscd)', type: 'info' });
  s.vars = { domain: 'example.com', step: 'os-cache', ttl: 0, cached: false };
  snap(steps, s, 'OS checks /etc/hosts and system DNS cache. Not found.', 3);

  s.chain[1].active = false;

  // Recursive resolver
  s.chain[2].active = true;
  s.activeNode = 'resolver';
  s.metrics.lookups++;
  s.events.push({ msg: 'Query recursive resolver (8.8.8.8)', type: 'info' });
  s.vars = { domain: 'example.com', step: 'recursive-resolver', ttl: 300, cached: false };
  snap(steps, s, 'Query sent to recursive resolver (8.8.8.8). Resolver does the heavy lifting.', 4);

  // Root NS
  s.chain[3].active = true;
  s.activeNode = 'root';
  s.metrics.lookups++;
  s.events.push({ msg: 'Resolver → Root NS: "who handles .com?"', type: 'info' });
  s.vars = { domain: 'example.com', step: 'root-ns', ttl: 300, cached: false };
  snap(steps, s, 'Resolver asks Root Nameserver: "Who handles .com TLD?"', 5);

  s.chain[3].active = false;
  s.chain[3].resolved = true;

  // TLD NS
  s.chain[4].active = true;
  s.activeNode = 'tld';
  s.metrics.lookups++;
  s.events.push({ msg: 'Root → .com TLD NS address', type: 'ok' });
  s.events.push({ msg: 'Resolver → TLD NS: "who handles example.com?"', type: 'info' });
  s.vars = { domain: 'example.com', step: 'tld-ns', ttl: 300, cached: false };
  snap(steps, s, 'Root responds with .com TLD NS address. Resolver queries .com TLD.', 6);

  s.chain[4].active = false;
  s.chain[4].resolved = true;

  // Authoritative NS
  s.chain[5].active = true;
  s.activeNode = 'auth';
  s.metrics.lookups++;
  s.events.push({ msg: 'TLD → authoritative NS for example.com', type: 'ok' });
  s.events.push({ msg: 'Resolver → Authoritative NS: "IP for example.com?"', type: 'info' });
  s.vars = { domain: 'example.com', step: 'authoritative-ns', ttl: 300, cached: false };
  snap(steps, s, 'TLD responds with authoritative NS. Resolver queries it directly.', 7);

  // Got IP
  s.chain[5].active = false;
  s.chain[5].resolved = true;
  s.result = { ip: '93.184.216.34', ttl: 300 };
  s.chain.forEach((n) => { if (n.type === 'nameserver' || n.id === 'resolver') n.resolved = true; });
  s.events.push({ msg: 'A record: example.com → 93.184.216.34 TTL=300s', type: 'ok' });
  s.metrics.ttl = 300;
  s.vars = { domain: 'example.com', step: 'resolved', ttl: 300, cached: false };
  snap(steps, s, 'Authoritative NS returns A record: 93.184.216.34 (TTL=300s).', 8);

  // Cached
  s.chain[0].cached = true;
  s.chain[1].cached = true;
  s.chain[2].cached = true;
  s.metrics.cached = 3;
  s.events.push({ msg: 'Result cached at resolver + OS + browser (TTL=300s)', type: 'ok' });
  s.vars = { domain: 'example.com', step: 'cached', ttl: 300, cached: true };
  snap(steps, s, 'IP cached at browser, OS, and resolver. Next lookup: 0ms (cache hit)!', 9);

  return steps;
}

export const DNS_CODE = [
  '// DNS lookup chain',
  '// 1. Browser cache (TTL check)',
  '// 2. OS cache (/etc/hosts, nscd)',
  '// 3. Recursive resolver (ISP / 8.8.8.8)',
  '// 4. Root nameservers (13 root clusters)',
  '// 5. TLD nameserver (.com, .org, etc.)',
  '// 6. Authoritative nameserver',
  '',
  '# Inspect DNS resolution',
  'dig +trace example.com',
  '',
  '# View OS cache',
  'resolvectl statistics',
  '',
  '# Common record types',
  '# A     → IPv4 address',
  '# AAAA  → IPv6 address',
  '# CNAME → canonical alias',
  '# MX    → mail exchange',
  '# TXT   → arbitrary text',
];

export default {
  id: 'dns',
  label: 'DNS Resolution',
  icon: '🔭',
  build: buildDnsSteps,
  code: DNS_CODE,
  language: 'bash',
  metrics: [
    { key: 'lookups', label: 'Lookups', max: 8,   color: 'var(--node-comparing)' },
    { key: 'cached',  label: 'Cached',  max: 4,   color: 'var(--pod-running)' },
    { key: 'ttl',     label: 'TTL (s)', max: 3600, color: 'var(--node-active)' },
  ],
};
