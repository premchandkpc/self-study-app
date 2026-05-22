# 📱 WhatsApp System Design — Complete Deep Dive

Designing WhatsApp is one of the most important distributed systems interview problems because it touches:

* Realtime systems
* Distributed messaging
* WebSockets
* Ordering guarantees
* Fanout
* Media storage
* Presence systems
* Scalability
* Encryption
* Multi-device sync
* Event-driven architecture
* CAP theorem tradeoffs
* Backpressure
* Offline delivery
* Reliability engineering

---

# 1. 🧠 Problem Understanding

At high level:

```text
User A sends message
        ↓
WhatsApp backend receives
        ↓
Routes to User B device(s)
        ↓
Stores if offline
        ↓
Delivers ACKs
        ↓
Syncs across devices
```

---

# 2. 🎯 Functional Requirements (FRs)

## Core Messaging

* 1-to-1 chat
* Group chat
* Media sharing
* Voice notes
* Stickers/GIFs
* Message reactions
* Delete message
* Edit message
* Forward message
* Reply/threading

---

## Realtime Features

* Online/offline presence
* Last seen
* Typing indicator
* Read receipts (✓ ✓ blue)
* Delivery receipts
* Push notifications

---

## Advanced Features

* Multi-device sync
* End-to-end encryption
* Status/stories
* Voice/video calls
* Broadcast lists
* Communities/channels

---

# 3. ⚡ Non Functional Requirements (NFRs)

## Availability

Very high availability:

```text
99.999% (five 9s)
```

Because messaging is mission critical.

---

## Scalability

WhatsApp scale roughly:

| Metric                 | Approx               |
| ---------------------- | -------------------- |
| Users                  | 2B+                  |
| Daily active           | 1B+                  |
| Messages/day           | 100B+                |
| Concurrent connections | Hundreds of millions |

---

## Latency

Realtime messaging needs:

| Operation        | Target         |
| ---------------- | -------------- |
| Message delivery | <100ms         |
| Typing indicator | <50ms          |
| Presence updates | <10s           |
| Media upload     | Fast streaming |

---

## Durability

Messages cannot disappear.

Need:

* Replication
* Persistent logs
* Retry queues

---

## Security

Critical:

* E2E encryption
* Secure key exchange
* Metadata protection
* Spam prevention

---

# 4. 📦 Back of Envelope Calculations

---

# Users

Assume:

```text
2 Billion users
```

DAU:

```text
1 Billion active/day
```

Concurrent online:

```text
200 Million
```

---

# Messages

Assume:

```text
100 Billion/day
```

Per second:

\frac{100\times10^9}{86400}\approx1.16\times10^6

≈ **1.2 million messages/sec**

Peak:

```text
3–5 million msg/sec
```

---

# Storage

Assume text message size:

```text
100 bytes
```

Metadata:

```text
500 bytes
```

Total:

```text
600 bytes/message
```

Daily storage:

100\times10^9\times600\approx60\times10^{12}

≈ **60 TB/day**

Yearly:

```text
~22 PB/year
```

WITHOUT media.

---

# Media Storage

Media dominates everything.

Assume:

* 500M photos/day
* avg 1MB

```text
500 TB/day
```

Videos explode further.

Need:

* CDN
* Object storage
* Compression

---

# 5. 🏗️ High Level Architecture

```text
          ┌────────────┐
          │ LoadBalancer│
          └─────┬──────┘
                │
      ┌─────────┴─────────┐
      │ Connection Servers │
      └─────────┬─────────┘
                │
        ┌───────┴────────┐
        │ Messaging Layer │
        └───────┬────────┘
                │
     ┌──────────┼──────────┐
     │          │          │
 Presence   MessageQ   MediaSvc
     │          │          │
 Redis      Kafka     BlobStore
     │          │          │
     └──────Storage────────┘
```

---

# 6. 🌐 Why WebSockets?

HTTP polling is terrible.

---

## Polling

```text
Client asks every 2 sec:
"Any new messages?"
```

Problems:

* Huge network waste
* High latency
* Massive server cost

---

## WebSocket

Persistent TCP connection.

```text
Client <=======> Server
```

Benefits:

* Bidirectional
* Low latency
* Efficient
* Realtime

WhatsApp uses long-lived connections.

---

# 7. 🔥 Connection Server Design

This is VERY important.

---

## Responsibility

Connection servers:

* Maintain TCP/WebSocket connections
* Authenticate users
* Route incoming packets
* Heartbeats
* Presence tracking

---

## Key Insight

Message servers SHOULD NOT maintain sockets.

Why?

Because:

* Stateful
* Expensive
* Hard to scale

Instead:

```text
Connection Layer
        ↓
Stateless Messaging Layer
```

Separation of concerns.

---

# 8. 🧭 User Routing Problem

How to find where user B is connected?

Need:

```text
userId → connectionServer
```

Stored in:

* Redis
* Distributed in-memory store

Example:

```text
user123 → conn-server-77
```

---

# 9. ✉️ Message Flow

---

# Case 1 — Receiver Online

```text
A sends message
    ↓
Connection server
    ↓
Messaging service
    ↓
Lookup B location
    ↓
Forward to B connection server
    ↓
Deliver to device
    ↓
ACK returned
```

---

# Case 2 — Receiver Offline

```text
A sends message
    ↓
Persist message
    ↓
Queue for B
    ↓
Push notification
    ↓
B reconnects later
    ↓
Replay queued messages
```

---

# 10. 📬 Message Queue Importance

Need queues because:

Users disconnect constantly.

Queues absorb:

* Traffic spikes
* Retry storms
* Offline buffering

Typically:

* Apache Kafka
* Custom queue
* Pulsar

---

# 11. 🧠 Kafka Topic Strategy

Possible partitioning:

```text
Partition by userId
```

Why?

Maintains ordering.

---

# Ordering Challenge

User sends:

```text
Hi
How are you?
```

Cannot become:

```text
How are you?
Hi
```

---

# Solution

Messages of same chat go to same partition.

Guarantees:

```text
Per-chat ordering
```

NOT global ordering.

Global ordering impossible at scale.

---

# 12. 🧩 Database Design

---

# Message Storage

Need:

* Append-heavy writes
* Sequential reads

Possible:

* Cassandra
* ScyllaDB
* RocksDB
* HBase

---

# Why NOT SQL?

At WhatsApp scale:

```text
Millions writes/sec
```

Sharding SQL becomes nightmare.

NoSQL better for:

* Horizontal scale
* Partition tolerance
* Fast writes

---

# Message Schema

```text
Message {
   messageId
   chatId
   senderId
   timestamp
   content
   type
   status
}
```

---

# 13. 🔐 End-to-End Encryption

Most important part.

WhatsApp uses:

```text
Signal Protocol
```

via Signal Foundation technologies.

---

# Core Principle

Server CANNOT read messages.

Server only routes encrypted blobs.

---

# Flow

```text
Sender encrypts
       ↓
Server relays ciphertext
       ↓
Receiver decrypts
```

---

# Keys

Need:

* Identity keys
* Session keys
* Prekeys

---

# Hard Problem

Offline users.

Solution:

* Store encrypted prekeys on server.

---

# 14. 📲 Multi Device Sync

VERY hard system design problem.

---

# Old WhatsApp

Phone was source of truth.

---

# Modern WhatsApp

Multiple devices independent.

Need:

* Device fanout
* Per-device encryption
* Sync engine

---

# Message Fanout

```text
User has:
Phone
Tablet
Laptop
```

Message must sync everywhere.

---

# Complexity Explosion

Instead of:

```text
1 sender → 1 receiver
```

Now:

```text
N sender devices → M receiver devices
```

Huge multiplier effect.

---

# 15. 👥 Group Chat Design

Group of 1000 users.

---

# Naive Approach

```text
Store 1000 copies
```

Very expensive.

---

# Better

Logical fanout.

```text
One incoming message
    ↓
Fanout workers
    ↓
Push individually
```

---

# Fanout Problem

Celebrity groups:

```text
1 message → millions recipients
```

Need:

* Async workers
* Distributed queues
* Backpressure

---

# 16. 🟢 Presence System

Shows:

* online
* typing
* last seen

---

# Challenge

Presence is extremely high frequency.

Millions of updates/sec.

---

# Storage

Use in-memory systems:

* Redis
* Memcached

NOT databases.

---

# Why?

Presence is ephemeral.

No need durable storage.

---

# 17. 🔵 Read Receipts

Flow:

```text
Message delivered
     ↓
Client sends ACK
     ↓
Update sender
```

Types:

* Sent
* Delivered
* Read

---

# Challenge

ACK storms.

Group of 1000:

* One message
* 1000 read ACKs

Need aggregation.

---

# 18. 📷 Media Upload Design

Messages are tiny.

Media is gigantic.

---

# Smart Flow

DON'T route media through messaging servers.

BAD:

```text
Client → WhatsApp → Storage
```

GOOD:

```text
Client → Blob storage directly
```

---

# Flow

```text
1. Client asks upload URL
2. Backend returns signed URL
3. Client uploads directly
4. Backend stores metadata
5. Share media reference
```

Used by:

* Amazon Web Services S3
* GCS
* CDN

---

# 19. 🚨 Push Notifications

Offline users:

* Android → FCM
* iPhone → APNS

Need:

* Retry logic
* Deduplication

---

# 20. 🌍 Geo Distributed Architecture

Need global scale.

Regions:

* India
* Europe
* US
* Asia

---

# Problem

Cross-region latency.

---

# Solution

Route users to nearest region.

BUT:

* Chats cross regions.

Need:

* Cross-region replication
* Event streaming
* Eventually consistent sync

---

# 21. ⚠️ CAP Theorem

Messaging systems choose:

```text
Availability + Partition tolerance
```

over strict consistency.

---

# Example

Temporary duplicate message acceptable.

But downtime unacceptable.

---

# 22. 🧨 Critical Edge Cases

---

# Duplicate Messages

Caused by:

* Retries
* Network failures

Need:

* Idempotency keys
* messageId dedup

---

# Out of Order Messages

Caused by:

* Multi-region replication
* Retries

Need:

* Sequence numbers
* Logical clocks

---

# Ghost Deliveries

Message delivered but ACK lost.

Need:

* ACK reconciliation

---

# Device Clock Wrong

Never trust client timestamps.

Use:

* Hybrid timestamps
* Server ordering

---

# Huge Group Flood

1M-member channel:

* Massive fanout spikes

Need:

* Queue buffering
* Rate limiting
* Async delivery

---

# Network Flapping

Mobile users constantly reconnect.

Need:

* Sticky sessions
* Resume tokens
* Heartbeats

---

# 23. 🚀 Scalability Concepts

---

# Horizontal Scaling

Add more:

* Connection servers
* Queue consumers
* Fanout workers

---

# Partitioning

Partition by:

* userId
* chatId

Avoid hot partitions.

---

# Hot Users Problem

Celebrity account overload.

Need:

* Dynamic sharding
* Replicated fanout

---

# 24. 🔥 Reliability Mechanisms

---

# Retries

Need exponential backoff.

---

# DLQ

Dead letter queue for failed deliveries.

---

# Circuit Breakers

Protect downstream services.

---

# Backpressure

Prevent overload.

Critical in realtime systems.

---

# 25. 🧠 Advanced Concepts Interviewers Love

---

# Exactly Once Delivery?

Impossible practically at scale.

Reality:

```text
At least once + deduplication
```

---

# Why TCP not enough?

TCP guarantees:

* Connection-level delivery

NOT:

* Distributed app semantics

---

# Why Kafka?

Because:

* Durable logs
* Replayability
* Ordering
* Scalability

---

# Why Separate Connection Servers?

Decoupling:

* Network state
* Business logic

Huge architectural win.

---

# Why Event Driven?

Messaging naturally event stream.

Events:

* MessageSent
* Delivered
* Read
* UserOnline

---

# 26. 📞 Voice/Video Calls

Different architecture entirely.

Need:

* WebRTC
* STUN/TURN
* UDP
* NAT traversal

Media path ideally P2P.

---

# 27. 🧱 Detailed Database Partitioning

Example:

```text
hash(chatId) % N
```

Benefits:

* Even distribution
* Per-chat ordering

---

# Challenge

Rebalancing partitions.

Need:

* Consistent hashing

---

# 28. 🧪 Tricky Interview Questions

---

## Q1. Why not REST?

Because realtime bidirectional communication needed.

---

## Q2. Why not global ordering?

Impossible at internet scale.

---

## Q3. How do you prevent duplicate delivery?

Idempotent message IDs.

---

## Q4. What if Kafka partition dies?

Replica leader election.

---

## Q5. How do you scale WebSockets?

Stateless gateway fleet + distributed routing map.

---

## Q6. How to support offline messaging?

Persistent queues + replay.

---

## Q7. Why Redis for presence?

Ultra low latency ephemeral state.

---

## Q8. How do you encrypt group chats?

Shared sender keys.

---

## Q9. How to avoid hot partitions?

Dynamic sharding.

---

## Q10. Why eventual consistency acceptable?

Chat systems prioritize availability.

---

# 29. 🧭 Full End-to-End Message Journey

```text
User Types
    ↓
Client encrypts
    ↓
WebSocket send
    ↓
Connection server
    ↓
Auth validation
    ↓
Kafka enqueue
    ↓
Persistence layer
    ↓
Receiver lookup
    ↓
Fanout worker
    ↓
Receiver connection server
    ↓
Receiver device
    ↓
ACK returned
    ↓
Read receipt update
```

---

# 30. 🏆 Final Production Architecture

```text
                CDN
                 │
          Media/Object Store
                 │
 ┌─────────────────────────────────┐
 │          Load Balancers         │
 └─────────────────────────────────┘
                 │
     ┌────────────────────────┐
     │   Connection Servers   │
     │ WebSocket/TCP Layer    │
     └────────────────────────┘
                 │
         Event Streaming Bus
              (Kafka)
                 │
 ┌────────┬────────┬────────┬────────┐
 │Message │Presence│Fanout  │Notif   │
 │Service │Service │Workers │Service │
 └────────┴────────┴────────┴────────┘
                 │
      ┌─────────────────────┐
      │ Cassandra/ScyllaDB  │
      └─────────────────────┘
                 │
         Cross Region Replication
```

---

# 31. 🎯 What Interviewers Actually Evaluate

Not whether you memorize boxes.

They check:

✅ Tradeoffs
✅ Bottleneck thinking
✅ Failure handling
✅ Scaling intuition
✅ Data flow understanding
✅ Distributed systems depth
✅ Reliability engineering
✅ Consistency reasoning
✅ Realtime architecture knowledge

---

# 32. 🔥 Most Important Takeaways

---

## WhatsApp is basically:

### 1. Connection Infrastructure

Millions of persistent sockets.

---

### 2. Event Streaming System

Messages flowing through queues.

---

### 3. Distributed Routing Layer

Finding users globally.

---

### 4. Storage System

Durable append-only logs.

---

### 5. Realtime State Engine

Presence + ACKs + typing.

---

### 6. Encryption Platform

Server cannot read messages.

---

# 33. 📚 Topics You Should Master After This

For strong system design depth:

* WebSockets
* TCP internals
* Kafka internals
* Cassandra internals
* CAP theorem
* Consistent hashing
* Distributed queues
* Fanout systems
* Backpressure
* Event sourcing
* CQRS
* Presence systems
* Push notification systems
* Encryption protocols
* Multi-region replication
* WebRTC
* Load balancing
* Sticky sessions
* Distributed locks
* Idempotency

---

# 34. 📋 API Design

---

## REST Endpoints

```text
POST   /v1/messages                     Send message
GET    /v1/messages/:chatId             Get chat history
PUT    /v1/messages/:messageId          Edit message
DELETE /v1/messages/:messageId          Delete message
POST   /v1/chats                        Create chat
GET    /v1/chats                        List chats
POST   /v1/groups                       Create group
POST   /v1/media/upload                 Request upload URL
GET    /v1/media/:mediaId               Download media
GET    /v1/users/:userId/profile        Get profile
PUT    /v1/users/:userId/profile        Update profile
POST   /v1/auth/register                Register device
POST   /v1/auth/keys                    Upload prekeys
```

---

## WebSocket Message Types

```text
Client → Server:
  SEND_MESSAGE        {chatId, content, type, messageId}
  TYPING_START        {chatId}
  TYPING_STOP         {chatId}
  MARK_READ           {chatId, upToMessageId}
  PRESENCE_UPDATE     {status: online|offline}
  ACK                 {messageId, status: delivered|read}

Server → Client:
  NEW_MESSAGE         {messageId, chatId, senderId, content, type, timestamp}
  MESSAGE_ACK         {messageId, status: delivered|read}
  TYPING_INDICATOR    {chatId, userId, isTyping}
  PRESENCE_CHANGE     {userId, status, lastSeen}
  RECONNECT_TOKEN     {token, expiry}
  THROTTLED           {reason, retryAfterMs}
```

---

# 35. 🔐 Signal Protocol Deep Dive

WhatsApp uses Signal Protocol — gold standard E2E encryption.

---

## Three Core Algorithms

```text
1. X3DH           — Initial key agreement
2. Double Ratchet — Ongoing message encryption
3. Sealed Sender  — Optional sender anonymity
```

---

## X3DH (Extended Triple Diffie-Hellman)

Establishes shared secret without prior interaction.

```text
Sender:    Identity Key IKₐ,  Ephemeral Key EKₐ
Receiver:  Identity Key IKᵦ,  Signed Prekey SPKᵦ,  One-time Prekey OPKᵦ

Shared = DH(IKₐ, SPKᵦ) || DH(EKₐ, IKᵦ) || DH(EKₐ, SPKᵦ) || DH(EKₐ, OPKᵦ)
```

Prekeys allow sending to offline users — bundles stored on server.

---

## Double Ratchet

After X3DH, per-message keys:

```text
Root Key ──DH ratchet──→ Chain Key ──KDF ratchet──→ Message Key
                                               ↓
                                          Encrypt message
                                               ↓
                                          Rotate forward
```

Properties:
* Forward secrecy — past keys useless if current key leaks
* Future (self-healing) secrecy — ratchet recovers after compromise

---

## Sealed Sender

Server cannot see sender identity:

```text
Server sees: {ciphertext, sender public key}
NOT:         Who sent to whom
```

---

## PNI (Post-Quantum)

Meta rolling out Kyber-1024 alongside X25519 for harvest-now-decrypt-later protection.

---

# 36. 🚦 Rate Limiting & Throttling

---

## Why

```text
Spam prevention
Resource protection
Fair usage enforcement
DDoS mitigation
```

---

## Layers

```text
L1: Per-user global limit
L2: Per-chat rate limit
L3: Media uploads/hour
L4: Connection rate (sessions/sec)
```

---

## Approximate Limits

| Operation          | Limit                  |
| ------------------ | ---------------------- |
| Messages sent      | 100/min               |
| Group creations    | 10/hour               |
| Media uploads      | 50/hour               |
| New connections    | 5/sec                 |
| Broadcast targets  | 256/msg               |

---

## Algorithm

Sliding Window Counter per (userId, resource):

```text
Redis: ZCOUNT rate_limit:user:msg:{userId} (now-60s, now)
```

## Throttling Response

```text
HTTP 429 + Retry-After: 30
WS: THROTTLED {reason, retryAfterMs}
```

## Backpressure Chain

```text
Client ──rate limited──→ Conn Srv ──queue──→ Msg Service
                           ↓
                Kafka max.inflight.requests
                           ↓
                Cassandra write throttling
```

---

# 37. 📊 Observability

---

## Metrics (Prometheus)

| Metric                      | Type      | Notes              |
| --------------------------- | --------- | ------------------ |
| messages_sent_total         | Counter   | by region          |
| messages_delivered_total    | Counter   |                    |
| messages_latency_ms         | Histogram | p50, p99, p999     |
| connections_active          | Gauge     |                    |
| connections_rate            | Counter   |                    |
| kafka_consumer_lag          | Gauge     | per partition      |
| redis_hit_ratio             | Gauge     |                    |
| cassandra_read_latency      | Histogram |                    |

---

## Distributed Tracing (OpenTelemetry)

TraceID = messageId for end-to-end correlation:

```text
Span: WS receive
  Span: Auth
  Span: Kafka produce
    Span: Cassandra persist
  Span: Fanout
    Span: Redis lookup
    Span: Kafka cross-region
    Span: WS send
```

---

## Logging

Structured JSON — never message content:

```text
{timestamp, traceId, userId, op, latency, status, region}
```

## Alerting

| Condition                   | Window   | Action             |
| --------------------------- | -------- | ------------------ |
| p99 latency >500ms          | 5min     | Page on-call       |
| Consumer lag >10k           | 1min     | Auto-scale         |
| Connection drops >5%        | 5min     | Network check      |
| Error rate >1%              | 5min     | Rollback if deploy |
| Redis memory >80%           | 10min    | Eviction tuning    |

---

# 38. 🔄 Disaster Recovery

---

## RPO/RTO Targets

```text
RPO: <1 second
RTO: <60 seconds
```

## Active-Active Multi-Region

```text
┌──────────┐         ┌──────────┐
│ Region A │ ←────→ │ Region B │
│ (US)     │  Kafka  │ (EU)     │
└──────────┘  Mirr  └──────────┘
     │        ing         │
  Cassandra ────────── Cassandra
  (local)    Async      (local)
             replication
```

## Failure Scenarios

### Region Failure

```text
1. DNS failover routes users
2. Other region absorbs connections
3. Kafka mirroring syncs streams
4. Cassandra eventual consistency catches up
```

### Kafka Broker Failure

```text
1. ISR (In-Sync Replica) takes over
2. Controller re-elects leader
3. Clients retry with metadata refresh
```

### User DB Failure

```text
1. Read replica promotion
2. Connection pool drain
3. Warm standby takeover
```

---

## Chaos Engineering

```text
- Randomly kill conn servers (low-traffic window)
- Inject Kafka broker failures
- Simulate region latency
- Test Cassandra node recovery
```

---

# 39. 💰 Cost Estimation

---

## Monthly Run Rate (Cloud Estimate)

| Resource          | Unit Cost  | Qty             | Monthly      |
| ----------------- | ---------- | --------------- | ------------ |
| Connection Srv    | $500/mo    | 10,000          | $5M          |
| Kafka Brokers     | $1000/mo   | 500             | $500K        |
| Cassandra Nodes   | $1000/mo   | 2000            | $2M          |
| Redis Clusters    | $800/mo    | 500             | $400K        |
| Object Storage    | $0.023/GB  | 15 PB/mo        | $345K        |
| CDN Egress        | $0.08/GB   | 50 PB/mo        | $4M          |
| Push Notifications| ~free      | 100B pushes     | ~$0          |
| Network Transit   | $10/TB     | 100 PB          | $1M          |
| Cross-region BW   | $0.02/GB   | 5 PB            | $100K        |
| **Total**         |            |                 | **~$13.3M**  |

Real costs lower — Meta uses custom hardware at datacenter scale.

---

## Storage Cost Breakdown

```text
Messages (text):   ~$60K/mo   (Cassandra)
Media (images):    ~$4M/mo    (Blob + CDN)
Backups:           ~$500K/mo
Cold storage:      ~$200K/mo  (>1 year old)
```

---

# 40. 🏭 Real WhatsApp Tech Stack

Known public details:

## Backend

| Layer              | Technology            |
| ------------------ | --------------------- |
| Server runtime     | Erlang (BEAM VM)      |
| OS                 | FreeBSD               |
| Connection proto   | Custom XMPP variant   |
| Database           | Custom (Mnesia-like)  |
| Message store      | Custom log-structured |
| Cache              | Custom in-memory      |
| Push notifications | Custom per-OS bridge  |

---

## Why Erlang?

```text
- Actor model ideal for concurrent connections
- Hot code reloading (zero-downtime deploy)
- Soft realtime GC (no stop-the-world)
- OTP supervision trees for fault tolerance
- Battle-tested at Ericsson for telephony
```

## Frontend

```text
Android: Kotlin + native WS
iOS:     Swift + native WS
Web:     React + WS
Desktop: C++ (Qt)
```

## Key Differentiators from Textbook Design

```text
- No standard DB (custom Mnesia-like storage)
- No standard queue (custom in-process routing)
- eRPC for internal RPC (Erlang native distribution)
- Each server acts as app server + message queue combined
- BEAM process per connection (lightweight, ~2KB each)
```

---

# 41. ⏰ Clock Skew & Distributed Ordering

---

## Problem

Servers across regions have clock drift:

```text
Server A (US): 12:00:00.100
Server B (EU): 12:00:00.050  (50ms behind)
```

Raw timestamps produce wrong ordering.

---

## Solutions

### Hybrid Logical Clocks (HLC)

Combines physical clock + logical counter:

```text
timestamp = (physicalMs, logicalCounter)

If physical > last: counter = 0
If physical == last: counter++
```

### Server-Side Sequence

```text
Write:  Server assigns monotonic sequence per chat
Read:   Client orders by server sequence, NOT device clock
```

### NTP Strategy

```text
- Every server runs NTP with multiple stratum-1 sources
- Alert if clock skew >10ms
- Clock slew (gradual adjustment), never jump
- LAN-local stratum-2 servers reduce jitter
```

---

## Split-Brain Detection

Network partition causes both regions to act as primary:

```text
1. Both regions accept writes
2. Conflict when partition heals

Solution:
  - Last-writer-wins per messageId (immutable)
  - CRDTs for presence state (merge-friendly)
  - Region-based tiebreaker for mutable data
  - Manual reconciliation queue for edge cases
```

---

# 42. 📐 Schema Registry & Event Evolution

---

## Problem

100B+ events/day — teams iterate constantly:

```text
Without registry:
  - Producer writes v2
  - Consumer still reads v1
  - Deserialization failures
```

---

## Solution

```text
Producer ──→ Schema Registry ←── Consumer
    │                              │
    └─── Kafka with SchemaId ──────┘
```

Each event carries `SchemaId` in header for versioning.

## Event Envelope

```text
Event {
  schemaId:    int
  traceId:     string
  eventType:   enum
  timestamp:   int64 (epoch ms)
  payload:     bytes (Avro/Protobuf)
}
```

## Evolution Rules

| Change                | Compatible?  | Rule                   |
| --------------------- | ------------ | ---------------------- |
| Add optional field    | Yes          | Fwd + backward         |
| Remove optional field | Yes          | Fwd + backward         |
| Rename field          | No           | Deprecate then add new |
| Change type           | No           | New schema version     |
| Required→optional     | Yes          | Forward                |

## Backfill

```text
1. Deploy consumer handling old + new formats
2. Convert old events via migration
3. Reproduce to new topic
4. Cut over
```

---

# 43. ⚖️ Compliance & Data Retention

---

## GDPR Requirements

```text
- Right to deletion
- Data portability (export chats)
- Access (what data do you have?)
- Processing limitation
```

## Implementation

```text
Deletion:
  - Soft delete: tombstone, still in backup
  - Hard delete: purge after 90 day grace

Export:
  - ZIP of messages, media, contacts
  - Async job (volume can be huge)
  - Signed URL, 7 day expiry

Retention:
  - Undelivered messages: deleted after 30 days
  - Delivered: kept until user deletes
  - Account: deleted 90 days after deletion request
```

## Data Classification

```text
Class 1: Message content        — E2E encrypted, server cannot read
Class 2: Metadata (who, when)   — Encrypted at rest, limited access
Class 3: Account (phone#, name) — Hashed in msg store, raw in user DB
Class 4: Device info            — Push notification routing only
```

## Privacy by Design

```text
- Server never has decryption keys
- Contact discovery uses hashed phone numbers
- No permanent logging of message content
- Ephemeral messages: ciphertext deleted after delivery
```
