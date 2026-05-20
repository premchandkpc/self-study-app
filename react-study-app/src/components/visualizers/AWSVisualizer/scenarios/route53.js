import { snap, svc, pkt } from '@/core/utils/scenarioShared';

function buildRoute53Steps() {
  const steps = []; const s = {
    nodes: [
      svc('client',     'User Browser',    'client', 30, 170, { desc: 'End-user typing domain in browser. DNS query starts here — OS resolver checks local cache first before hitting DNS server.' }),
      svc('route53',    'Route53 DNS',     'server', 230, 170, { zone: 'example.com', records: 6, desc: 'Managed DNS service. Global by design — no regional constraint. Authoritative for your domain. Hosted zone = DNS database for a domain. Supports public + private zones.', ttl: 300 }),
      svc('alb',        'ALB (ALIAS)',     'apigw',  430, 80,  { desc: 'Application Load Balancer for primary region (us-east-1). Route53 ALIAS record points here — free query, no charge. Can route to ALB, CloudFront, Elastic Beanstalk, S3.' }),
      svc('ec2',        'EC2 App (Primary)','server', 430, 250, { desc: 'Web server in primary region (us-east-1a). Traffic lands here when health check passes. Instance monitored by Route53 health check every 30s.', region: 'us-east-1' }),
      svc('ec2Dr',      'EC2 App (DR)',     'server', 430, 400, { desc: 'Standby server in secondary region (us-west-2). Idle until failover triggers. Route53 failover routing sends traffic here when primary fails.', region: 'us-west-2' }),
      svc('healthCheck', 'HealthCheck',     'lambda', 630, 170, { desc: 'Route53 health check monitor. GET /health endpoint every 30s. Checks: HTTP 200, response body match, latency < 5s. Can be associated with DNS records for auto-failover.', interval: 30 }),
      svc('failover',   'Failover\nPolicy', 'apigw',  630, 350, { desc: 'Failover routing policy. Active-passive: primary gets all traffic, DR gets zero (until failover). Health check status determines which record answers DNS queries.', primaryActive: true }),
    ],
    edges: [
      { from: 'client', to: 'route53' }, { from: 'route53', to: 'alb' }, { from: 'route53', to: 'ec2Dr' },
      { from: 'alb', to: 'ec2' }, { from: 'healthCheck', to: 'ec2' }, { from: 'healthCheck', to: 'failover' },
      { from: 'failover', to: 'route53' },
    ],
    packets: [], events: [],
    metrics: { queries: 0, healthy: 1, failovers: 0, latencyMs: 0 },
    activeEdge: null,
  };

  snap(steps, s, 'Route53 = AWS managed DNS. Translates domain names (example.com) → IP addresses (load balancer DNS). Global service — runs on AWS edge locations worldwide. Supports: A/AAAA/CNAME/ALIAS/TXT/MX/NS/SRV records. Key concept: hosted zone = DNS database container for one domain. Public hosted zone: answers queries from internet. Private hosted zone: answers queries only within your VPC (internal DNS).', 1);

  s.events.push({ type: 'info', msg: 'Client: dig example.com → OS resolver → root DNS → .com TLD → Route53 nameserver → return A record' });
  s.packets = [pkt('client', 'route53', 'dig example.com A', 'request')];
  s.packets = [pkt('route53', 'client', 'A (ALIAS) → dualstack.my-alb-123.elb.amazonaws.com', 'response')];
  s.metrics.queries = 1;
  snap(steps, s, 'DNS resolution chain: 1) Browser checks local DNS cache, 2) OS resolver queries root DNS ("who manages .com?"), 3) .com TLD nameserver says "ask Route53 NS1-4...", 4) Route53 authoritative NS returns the ALIAS record. ALIAS record: Route53-specific — maps apex domain (example.com — no www) to AWS resources (ALB, CloudFront, S3). Unlike CNAME, ALIAS works at zone apex. CNAME: only works for subdomains (www.example.com). ALIAS: free query (no Route53 charge).', 2);

  s.packets = [];
  s.events.push({ type: 'ok', msg: 'Simple routing: example.com → A record → ALB. One record, one target. TTL: 300s (5 min caching).' });
  snap(steps, s, 'Simple routing policy: the default. Single record with single value. Route53 returns the same answer for every query. Best for: single web server, basic ALB, simple architecture. TTL (Time-To-Live): how long DNS resolvers cache the record. Short TTL (60s): faster failover, more queries (cost). Long TTL (3600s): fewer queries, cheaper, slower propagation of changes. Trade-off: short TTL for latency-sensitive/health-checked records, long TTL for stable records.', 3);

  s.nodes[6].state = 'active';
  s.events.push({ type: 'info', msg: 'Weighted routing: 90% prod → v1 (blue), 10% canary → v2 (green). Gradual rollout with health check gate.' });
  snap(steps, s, 'Weighted routing policy: distribute traffic across multiple records by weight. Common use: canary deployments — 10% traffic to new version, 90% to old version. Weights: 0-255. If weight = 0: record returned only if all non-zero weight records are unhealthy. Route53 returns records proportional to their weight. Combine with health checks: unhealthy records are excluded (even if they have weight). Perfect for blue/green deployments, canary releases, A/B testing at DNS level.', 4);

  s.events.push({ type: 'ok', msg: 'Latency-based: route to lowest-latency region. Route53 measures latency from user\'s ISP to AWS regions. Global users → fastest region.' });
  snap(steps, s, 'Latency routing policy: Route53 routes users to the region with the lowest latency for that user. AWS maintains a "latency map" — measured from user\'s DNS resolver to each AWS region. Different users in different locations get routed to different regions. Use for: global applications with multi-region deployment. Important: latency != proximity — the geographically closest region may not have the lowest latency (network topology matters). No health check required but highly recommended.', 5);

  s.events.push({ type: 'info', msg: 'Geolocation routing: users in Europe → eu-west-1, NA → us-east-1, Asia → ap-southeast-1. Based on query source IP.' });
  snap(steps, s, 'Geolocation routing policy: route based on the geographic location of the user. Uses the DNS resolver\'s IP to determine continent/country/state. Use cases: regional content restrictions (GDPR → serve EU-only), localized content (language-specific sites), regulatory compliance (data sovereignty). Default record: catches all users not matched by any geolocation rule. Overlap: more specific location (country) overrides broader (continent). No default = NXDOMAIN for unmatched locations.', 6);

  s.packets = [pkt('healthCheck', 'ec2', 'GET /health → 200 OK', 'request')];
  s.packets = [pkt('ec2', 'healthCheck', '200 OK (healthy)', 'response')];
  s.events.push({ type: 'ok', msg: 'Health check: HTTP GET /health every 30s. Expects 200. Failure threshold: 3 consecutive (90s). String match: "OK".' });
  snap(steps, s, 'Route53 Health Check: monitors endpoint health. Checks: connect (TCP), HTTP/HTTPS (status code 200-399), HTTPS_STR_MATCH (status + body contains string). Interval: 30s (standard) or 10s (fast, extra cost). Failure threshold: N consecutive failures (default 3, so ~90s). Calculated health checks: combine multiple checks (AND/OR, 256 max). CloudWatch alarm integration: link health check to CloudWatch alarm for custom actions. Health check status: healthy (green), unhealthy (red).', 7);

  s.packets = [];
  s.events.push({ type: 'ok', msg: 'Geoproximity routing: bias +50 shifts traffic 50% toward us-east-1. Uses AWS Region + latitude/longitude. Traffic flow policies.' });
  snap(steps, s, 'Geoproximity routing policy (Traffic Flow only): route based on geographic location of user AND your resources. Add bias: positive bias pulls more traffic to a region, negative pushes traffic away. Bias range: -99 to +99. Use case: shift more traffic to a region as it gets closer to limits, or redirect traffic away from an overloaded region. Requires Route53 Traffic Flow (extra cost per policy record). Traffic Flow: visual editor for complex routing trees — combines geolocation + geoproximity + failover + weighted in one diagram.', 8);

  s.nodes[1].state = 'active';
  s.events.push({ type: 'info', msg: 'TTL caching: client\'s ISP resolver caches DNS response for 300s. Route53 sets TTL per record. Short TTL = faster updates, more cost.' });
  snap(steps, s, 'TTL (Time-To-Live): how long a DNS resolver caches the record. Route53 sets TTL per record set. Browser → OS resolver → ISP/recursive resolver → Route53. Each level can cache. ISP resolvers often ignore TTL (some set minimum 60s regardless). Effect of TTL: short (60s) = DNS change propagates in 1 min, but more queries (cost). Long (86400s = 24h) = fewer queries (cheap), but change takes 24h. Recommendation: use TTL=60s for health-checked records (fast failover). Use TTL=3600s for static records (MX, TXT, NS). AAAA/ALIAS with health check: TTL=60-120s ideally.', 9);

  s.nodes[2].state = 'error'; s.nodes[3].state = 'error';
  s.events.push({ type: 'error', msg: '💥 PRIMARY REGION FAILURE: us-east-1 outage. ALB unreachable. Health check fails 3 consecutive times.' });
  snap(steps, s, 'Failure scenario: us-east-1 experiences an outage. ALB stops responding. Route53 health check sends GET /health → timeout or 5xx. After 3 consecutive failures (~90s), health check marks ALB as unhealthy. Route53 failover routing policy detects health check status change. DNS failover activation begins.', 10);

  s.nodes[2].state = 'error'; s.nodes[5].state = 'idle';
  s.failover.primaryActive = false; s.metrics.healthy = 0;
  s.events.push({ type: 'warn', msg: 'Health check RED (unhealthy). Failover routing: remove primary record from DNS responses. Route53 starts returning DR record.' });
  snap(steps, s, 'Health check transitions to unhealthy. Route53 failover policy: when primary health check is unhealthy, Route53 stops returning the primary record in DNS responses. DNS resolvers that have cached the old response still go to primary (until TTL expires — this is why short TTL matters!). After TTL expiry (300s), resolvers re-query Route53 and get the DR (secondary) record. DNS failover is NOT instant — TTL determines propagation delay. For fast failover: use TTL=60s + health check failure threshold=2 (60s detection + 60s propagation = ~2min total).', 11);

  s.metrics.failovers = 1; s.nodes[4].state = 'active'; s.nodes[3].state = 'idle';
  s.packets = [pkt('client', 'route53', 'dig example.com A (cache expired)', 'request')];
  s.packets = [pkt('route53', 'client', 'A → secondary.us-west-2.elb.amazonaws.com (failover)', 'response')];
  s.events.push({ type: 'warn', msg: '⚡ DNS FAILOVER: new queries return DR (us-west-2) record. Traffic shifts to secondary region. RTO: ~2-3min.' });
  snap(steps, s, 'Active-passive failover: primary gets all traffic when healthy. Secondary receives zero traffic (idle). On failure: Route53 returns secondary record. Users experience no change — same domain, different IP. RTO (Recovery Time Objective): depends on TTL + health check interval. With 30s health check + 60s TTL + 3 failures, RTO ≈ 2-3min. For faster RTO (<60s): use 10s health checks (extra cost) + TTL=20s, but expect higher query costs. Active-active failover (Route53): weighted routing with health checks — all records active, unhealthy ones removed from rotation.', 12);

  s.nodes[2].state = 'active'; s.nodes[3].state = 'active';
  s.events.push({ type: 'ok', msg: 'Primary restored: health check GREEN again. Failover policy automatically switches back to primary (or you can set "primary = active" for manual failback).' });
  snap(steps, s, 'Failback: when primary health check returns to healthy, Route53 automatically includes the primary record again. If both primary and secondary are healthy: primary wins (failover policy is active-passive). Common architectures: pilot light (DR running minimal, scale up on failover), warm standby (DR running full size, zero traffic), multi-region active-active (both handle traffic via latency routing). Route53 health checks can also monitor CloudWatch alarms — combine with CloudWatch composite alarms for sophisticated failure detection.', 13);

  s.nodes[1].state = 'active';
  s.events.push({ type: 'info', msg: 'Route53 Resolver: hybrid DNS between on-prem + AWS. Resolver endpoints: inbound (on-prem → VPC), outbound (VPC → on-prem). Conditional forwarding rules.' });
  snap(steps, s, 'Route53 Resolver: bridges on-premise DNS and VPC DNS. Inbound endpoint: on-prem servers can forward DNS queries to Route53 Resolver (to resolve internal AWS hostnames). Outbound endpoint: VPC resources can resolve on-prem hostnames via conditional forwarding rules. Use: hybrid cloud DNS — on-prem apps connect to AWS resources by private DNS name. Works over Direct Connect or VPN. Resolver endpoints are highly available (2+ ENIs per AZ). No need to maintain your own DNS forwarders (BIND, Unbound) on EC2.', 14);

  s.nodes[6].state = 'active';
  s.events.push({ type: 'ok', msg: 'DNSSEC: Route53 supports DNSSEC signing + validation. Prevents DNS spoofing/cache poisoning. Adds DNSKEY, RRSIG, DS records.' });
  snap(steps, s, 'DNSSEC (DNS Security Extensions): cryptographic signing of DNS records. Prevents man-in-the-middle attacks on DNS (cache poisoning). Route53 handles DNSSEC signing — creates DNSKEY + RRSIG records for your hosted zone. Parent zone (e.g., .com registrar) needs DS record with the hash of your zone-signing key. How it works: resolver asks for record + signature (RRSIG), resolver validates using DNSKEY, ensures response is authentic and unmodified. Route53 Resolver can also validate DNSSEC (adds validation to outbound queries). Enable: one-click in hosted zone settings. No ongoing management needed.', 15);

  s.result = 'Route53: DNS resolution → routing policy → health check → failover → Resolver/DNSSEC. TTL is king for failover speed.';
  snap(steps, s, 'Key takeaways: 1) ALIAS records at zone apex (free + works with AWS resources). 2) TTL controls failover speed (short TTL = fast failover, higher cost). 3) Health checks are mandatory for failover routing. 4) Weighted routing for canary/blue-green. 5) Latency routing for global multi-region. 6) Geolocation for regional compliance. 7) Geoproximity + Traffic Flow for complex routing. 8) Route53 Resolver for hybrid DNS. 9) DNSSEC for security. 10) Private hosted zones for VPC internal DNS. 11) Routing policies can be combined via Traffic Flow.', 16);

  return steps;
}

const CODE = [
  '# Create public hosted zone',
  'aws route53 create-hosted-zone --name example.com --caller-reference 2024-01',
  '# Create A record (ALIAS to ALB)',
  `aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "dualstack.my-alb-123.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'`,
  '# Weighted routing (90/10 canary)',
  '# Create 2 A records with same name + Weight property',
  '# Latency routing',
  '# Same as above but RoutingPolicy: Latency, Region: us-east-1',
  '# Failover routing',
  '# Primary: SetIdentifier=primary, Failover=PRIMARY, HealthCheckId=hc-123',
  '# Secondary: SetIdentifier=secondary, Failover=SECONDARY',
  '# Health check',
  `aws route53 create-health-check --caller-reference hc-2024 \\
    --health-check-config Type=HTTP,ResourcePath=/health,FullyQualifiedDomainName=example.com,Port=80,RequestInterval=30,FailureThreshold=3`,
  '# TTL: set per record (in seconds)',
  'TTL=60   # fast failover',
  'TTL=3600 # stable/static records',
  '# Private hosted zone (VPC internal)',
  `aws route53 create-hosted-zone --name internal.example.com \\
    --vpc VPCRegion=us-east-1,VPCId=vpc-123 --caller-reference 2024-01`,
  '# DNSSEC signing',
  'aws route53 enable-hosted-zone-dnssec --hosted-zone-id Z123',
  `aws route53 create-key-signing-key --hosted-zone-id Z123 \\
    --key-management-service-arn arn:aws:kms:.../key/dnssec-key`,
  '# Route53 Resolver (inbound)',
  `aws route53resolver create-resolver-endpoint --name inbound-ep \\
    --direction INBOUND --security-group-ids sg-123 \\
    --ip-addresses SubnetId=subnet-123,Ip=10.0.1.10`,
  '# Query logging',
  `aws route53 create-query-logging-config --hosted-zone-id Z123 \\
    --cloud-watch-logs-log-group-arn arn:aws:logs:...:log-group:route53-query:*`,
];

export default {
  id: 'route53', label: 'Route53', icon: '🌐',
  build: buildRoute53Steps, code: CODE, language: 'CLI',
  metrics: [
    { key: 'queries',    label: 'DNS Queries', max: 5,   color: 'var(--node-default)' },
    { key: 'healthy',    label: 'Healthy',      max: 1,   color: 'var(--pod-running)', warn: 0, critical: 0 },
    { key: 'failovers',  label: 'Failovers',    max: 3,   color: 'var(--pod-error)' },
    { key: 'latencyMs',  label: 'Latency (ms)', max: 500, unit: 'ms', color: 'var(--node-comparing)', warn: 200, critical: 400 },
  ],
  topicContent: {
    concept: [
      { title: 'DNS Resolution', content: 'Route53 translates domain names to IP addresses via hosted zones. Supports public (internet) and private (VPC) zones.' },
      { title: 'Routing Policies', content: 'Simple, Weighted, Latency, Geolocation, Geoproximity, Failover, and Multi-Value — each serves different traffic distribution needs.' },
    ],
    why: ['DNS is the first touchpoint for your application — misconfigured DNS means users cannot reach you at all, regardless of backend health.'],
    interview: [
      { question: 'What is the difference between an ALIAS record and a CNAME record in Route53?', answer: 'ALIAS works at zone apex (root domain like example.com) and is free, while CNAME only works for subdomains (www.example.com). ALIAS can point to AWS resources like ALB, CloudFront, S3.', followUps: ['Can a CNAME point to an apex domain?', 'What happens to ALIAS during failover?'] },
      { question: 'How does Route53 failover work and what is the RTO?', answer: 'Route53 health checks monitor endpoints every 30s. After N consecutive failures (default 3, ~90s), failover routing returns the secondary record. RTO depends on TTL + health check interval, typically 2-3 minutes.', followUps: ['How can you reduce RTO below 60 seconds?', 'What is active-active vs active-passive failover?'] },
    ],
    gotcha: ['TTL is king for failover speed — a long TTL (3600s) means DNS resolvers cache old records for an hour even after failover triggers.', 'Health checks only monitor from AWS locations — they cannot detect client-side network issues or ISP DNS caching problems.'],
    tradeoffs: [
      { pro: 'Global service with no regional constraints — single pane of glass for DNS across all AWS regions.', con: 'DNS caching at ISPs and browsers means changes propagate slowly regardless of Route53 configuration.' },
      { pro: 'Rich routing policy options (weighted, latency, geolocation) enable sophisticated traffic management.', con: 'Complex routing configurations require Route53 Traffic Flow (extra cost) and can be hard to debug.' },
    ],
  },
};
