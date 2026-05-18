import { snap } from './shared';

function buildPubSubSteps() {
  const steps = [];

  const s = {
    publisher: { id: 'pub', channels: ['news', 'sports'], sending: null },
    channels: [
      { name: 'news',   subscribers: ['sub1', 'sub2', 'sub3'] },
      { name: 'sports', subscribers: ['sub2', 'sub4'] },
    ],
    subscribers: [
      { id: 'sub1', subscribed: ['news'],            received: [], active: false },
      { id: 'sub2', subscribed: ['news', 'sports'],  received: [], active: false },
      { id: 'sub3', subscribed: ['news'],            received: [], active: false },
      { id: 'sub4', subscribed: ['sports'],          received: [], active: false },
    ],
    message: null,
    events: [],
    metrics: { published: 0, delivered: 0, subscribers: 4 },
    vars: { channel: '', message: '', subscribers: 4, delivered: 0 },
  };

  snap(steps, s, 'Redis Pub/Sub ready. 1 publisher, 4 subscribers across 2 channels: "news" and "sports".', 1, 'O(n) fanout');

  // Subscribers subscribe
  s.subscribers[0].active = true;
  s.events.push({ type: 'info', msg: 'sub1: SUBSCRIBE news' });
  s.vars = { channel: 'news', message: '', subscribers: 4, delivered: 0 };
  snap(steps, s, 'sub1 subscribes to "news" channel. Client enters subscription mode — no commands allowed except SUB/UNSUB.', 2, 'O(1) SUBSCRIBE');

  s.subscribers[0].active = false;
  s.subscribers[1].active = true;
  s.events.push({ type: 'info', msg: 'sub2: SUBSCRIBE news sports' });
  snap(steps, s, 'sub2 subscribes to both "news" and "sports". Pattern subscriptions (PSUBSCRIBE) support wildcards.', 3, 'O(1) SUBSCRIBE');

  s.subscribers[1].active = false;
  s.subscribers[2].active = true;
  s.subscribers[3].active = true;
  s.events.push({ type: 'info', msg: 'sub3: SUBSCRIBE news | sub4: SUBSCRIBE sports' });
  snap(steps, s, 'sub3 → news. sub4 → sports. All 4 subscribers are now listening. Redis maintains channel → subscriber mappings.', 4, 'O(1) SUBSCRIBE');

  s.subscribers[2].active = false;
  s.subscribers[3].active = false;

  // Publish to news
  s.publisher.sending = 'news';
  s.message = { channel: 'news', text: 'Breaking: Markets up 2%!' };
  s.events.push({ type: 'ok', msg: 'PUBLISH news "Breaking: Markets up 2%!"' });
  s.metrics.published = 1;
  s.vars = { channel: 'news', message: 'Breaking: Markets up 2%!', subscribers: 3, delivered: 0 };
  snap(steps, s, 'Publisher sends: PUBLISH news "Breaking: Markets up 2%!". Redis fanouts to all 3 news subscribers.', 5, 'O(n) PUBLISH');

  // Deliver to news subscribers
  const newsSubscribers = [0, 1, 2];
  for (const idx of newsSubscribers) {
    s.subscribers[idx].active = true;
    s.subscribers[idx].received.push({ channel: 'news', text: 'Breaking: Markets up 2%!' });
    s.metrics.delivered += 1;
    s.vars = { channel: 'news', message: 'Breaking: Markets up 2%!', subscribers: 3, delivered: s.metrics.delivered };
    snap(steps, s, `Delivered to ${s.subscribers[idx].id}. Redis pushes message synchronously — no polling, instant delivery!`, 6, 'O(n) delivery');
    s.subscribers[idx].active = false;
  }

  s.publisher.sending = null;
  snap(steps, s, 'PUBLISH news complete. 3 messages delivered. PUBLISH returns subscriber count (3). Fire-and-forget: no persistence!', 7, 'O(n) PUBLISH');

  // Publish to sports
  s.publisher.sending = 'sports';
  s.message = { channel: 'sports', text: 'Goal! City 2-1 United' };
  s.events.push({ type: 'ok', msg: 'PUBLISH sports "Goal! City 2-1 United"' });
  s.metrics.published = 2;
  s.vars = { channel: 'sports', message: 'Goal! City 2-1 United', subscribers: 2, delivered: s.metrics.delivered };
  snap(steps, s, 'Publisher sends to "sports" channel. Only sub2 and sub4 are subscribed. Message goes to 2 subscribers.', 8, 'O(n) PUBLISH');

  for (const idx of [1, 3]) {
    s.subscribers[idx].active = true;
    s.subscribers[idx].received.push({ channel: 'sports', text: 'Goal! City 2-1 United' });
    s.metrics.delivered += 1;
    s.vars = { channel: 'sports', message: 'Goal! City 2-1 United', subscribers: 2, delivered: s.metrics.delivered };
    snap(steps, s, `Delivered to ${s.subscribers[idx].id}. sub2 received on both channels — cross-channel subscriber.`, 9, 'O(n) delivery');
    s.subscribers[idx].active = false;
  }

  s.publisher.sending = null;
  s.message = null;
  snap(steps, s, `Pub/Sub complete. Published 2 messages, ${s.metrics.delivered} total deliveries. Note: messages not persisted — use Redis Streams for durability.`, 10, 'O(n) PUBLISH');

  return steps;
}

export const PUB_SUB_CODE = [
  '# Subscriber (enters listen mode)',
  'SUBSCRIBE news sports',
  '# → 1) "subscribe" 2) "news" 3) 1',
  '# → 1) "subscribe" 2) "sports" 3) 2',
  '',
  '# Pattern subscribe (wildcard)',
  'PSUBSCRIBE news:*   # matches news:world, news:tech',
  '',
  '# Publisher (any client)',
  'PUBLISH news "Breaking: Markets up 2%!"',
  '# → (integer) 3   (number of receivers)',
  '',
  'PUBLISH sports "Goal! City 2-1 United"',
  '# → (integer) 2',
  '',
  '# Subscriber receives:',
  '# 1) "message"',
  '# 2) "news"',
  '# 3) "Breaking: Markets up 2%!"',
  '',
  '# Unsubscribe',
  'UNSUBSCRIBE news',
  '',
  '# Note: Pub/Sub has NO persistence.',
  '# Use XADD/XREAD (Redis Streams) for durability.',
];

export default {
  id: 'pub-sub',
  label: 'Pub/Sub Channels',
  icon: '📡',
  build: buildPubSubSteps,
  code: PUB_SUB_CODE,
  language: 'Redis',
  metrics: [
    { key: 'published',   label: 'Published',    max: 5,  color: 'var(--kafka-producer)' },
    { key: 'delivered',   label: 'Delivered',    max: 10, color: 'var(--pod-running)' },
    { key: 'subscribers', label: 'Subscribers',  max: 6,  color: 'var(--node-active)' },
  ],
};
