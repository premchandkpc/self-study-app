# 🚕 Uber System Design — Complete Deep Dive

Designing Uber is one of the richest system design problems because it combines:

* Realtime geo systems
* Matching algorithms
* Maps & routing
* Stateful location streams
* Distributed event systems
* Dynamic pricing
* Payments
* High availability
* Low latency
* Streaming pipelines
* Spatial indexing
* Dispatch systems
* Fault tolerance

This problem is VERY different from WhatsApp.

WhatsApp = messaging-centric
Uber = realtime geo-computation-centric

---

# 1. 🧠 Core Problem Statement

```text
Passenger opens app
      ↓
Nearby drivers discovered
      ↓
Ride requested
      ↓
Matching engine selects driver
      ↓
Driver accepts
      ↓
Live trip tracking
      ↓
Payment processing
```

---

# 2. 🎯 Functional Requirements (FRs)

---

# Rider Features

* Register/login
* Set pickup/drop
* Nearby drivers map
* Request ride
* ETA estimation
* Fare estimation
* Live tracking
* Cancel ride
* Payment
* Ratings/reviews
* Ride history

---

# Driver Features

* Go online/offline
* Share live GPS
* Accept/reject rides
* Navigation
* Earnings dashboard

---

# Platform Features

* Matching/dispatch
* Surge pricing
* Fraud detection
* Notifications
* Trip analytics
* Route optimization

---

# 3. ⚡ Non Functional Requirements (NFRs)

---

# Low Latency

VERY important.

| Operation              | Target |
| ---------------------- | ------ |
| Driver location update | <1 sec |
| Nearby driver query    | <100ms |
| Match decision         | <200ms |
| ETA computation        | <500ms |

---

# Availability

Critical because:

* Real-world transportation
* Financial transactions
* Safety implications

Need:

```text
99.99%+
```

---

# Scalability

Assume global scale:

| Metric           | Approx           |
| ---------------- | ---------------- |
| Riders           | 150M             |
| Drivers          | 10M              |
| Concurrent rides | Millions         |
| GPS updates/sec  | Tens of millions |

---

# Consistency

Need selective strong consistency.

Example:

* Payment → strong consistency
* Driver locations → eventual consistency acceptable

---

# 4. 📦 Back of Envelope Calculations

---

# Assume

```text
10 Million active drivers
```

Each sends location every:

```text
4 seconds
```

Updates/sec:

\frac{10\times10^6}{4}=2.5\times10^6

≈ **2.5 million GPS updates/sec**

This is MASSIVE.

---

# Storage Estimation

GPS event:

| Field     | Size |
| --------- | ---- |
| DriverId  | 16B  |
| Lat/Lon   | 16B  |
| Timestamp | 8B   |
| Metadata  | 60B  |

≈ 100 bytes/event

Daily:

2.5\times10^6\times100\times86400\approx21.6\times10^{12}

≈ **21 TB/day**

Only GPS streams.

---

# 5. 🏗️ High Level Architecture

```text
                ┌──────────────┐
                │ Load Balancer│
                └──────┬───────┘
                       │
        ┌──────────────┴─────────────┐
        │ API Gateway / Edge Servers │
        └──────────────┬─────────────┘
                       │
 ┌─────────┬───────────┼─────────────┬──────────┐
 │ UserSvc │ DriverSvc │ MatchingSvc │ Pricing  │
 └─────────┴───────────┴─────────────┴──────────┘
                       │
                 Event Stream
                    Kafka
                       │
     ┌────────────┬──────────────┐
     │ Geo Service│ ETA Service  │
     └────────────┴──────────────┘
                       │
              Distributed Storage
```

---

# 6. 🌍 Core Challenge = Geo Spatial Systems

This is THE hardest part.

Uber is fundamentally:

```text
Realtime spatial search engine
```

Need to answer:

```text
Find nearest available drivers
```

VERY fast.

---

# 7. 📍 Why Normal Databases Fail

Naive SQL:

```sql
SELECT *
FROM drivers
WHERE distance(driver, rider) < 5km;
```

At millions scale:
❌ Terrible

Need specialized geo indexing.

---

# 8. 🧭 GeoHash Concept

Critical interview topic.

---

# Idea

Convert lat/lon into grid strings.

Example:

```text
tdr5ru
```

Nearby locations share prefixes.

---

# Visualization

```text
World
 └── Country
      └── City
           └── Area
                └── Street
```

Like spatial partitioning tree.

---

# Benefit

Instead of scanning world:

```text
Search nearby GeoHash cells only
```

Massive optimization.

---

# 9. 🗺️ Spatial Indexing Approaches

---

# Option 1 — GeoHash

Simple and scalable.

---

# Option 2 — QuadTree

Recursive spatial partitioning.

```text
Region
 ├── NW
 ├── NE
 ├── SW
 └── SE
```

---

# Option 3 — H3 (Uber's own system)

Uber created:

H3

Hexagonal spatial indexing.

---

# Why Hexagons?

Better neighbor uniformity than squares.

Squares have:

* diagonal distortion
* unequal distances

Hexagons:
✅ better adjacency
✅ smoother coverage
✅ more uniform radius

---

# 10. 🚖 Driver Location Flow

---

# Driver App

Every few seconds:

```text
GPS → Backend
```

---

# Flow

```text
Driver Device
      ↓
Edge Gateway
      ↓
Location Stream Service
      ↓
Kafka
      ↓
Geo Index Update
      ↓
Realtime Cache
```

---

# Why Kafka?

Because:

* Millions updates/sec
* Decoupling
* Replayability
* Streaming analytics

Use:
Apache Kafka

---

# 11. 🔥 Realtime Driver Storage

Cannot store active locations in SQL.

Need:

* in-memory
* ultra-fast writes

Use:

* Redis GEO
* Cassandra
* custom geo engine

---

# 12. 📌 Nearby Driver Query

When rider opens app:

```text
Find drivers within X km
```

---

# Flow

```text
Pickup location
      ↓
GeoHash/H3 lookup
      ↓
Find neighboring cells
      ↓
Fetch active drivers
      ↓
Sort by ETA
```

---

# 13. 🧠 Matching Engine

One of the most important systems.

---

# Inputs

* Driver distance
* ETA
* Driver rating
* Surge zone
* Driver preferences
* Ride type
* Traffic
* Demand prediction

---

# Output

```text
Best driver candidate
```

---

# Matching Algorithm

Can be:

* Greedy nearest
* Weighted score
* ML ranking

---

# Example Score

```text
score =
  distanceWeight
+ ratingWeight
+ acceptanceProbability
+ surgeFactor
```

---

# 14. ⏱️ ETA Calculation

Harder than people think.

Need:

* road graph
* live traffic
* turn restrictions
* historical traffic

---

# Components

```text
Maps
 + Traffic
 + Routing graph
 + ML prediction
```

---

# Routing Algorithms

Important interview topic.

---

# Dijkstra

Shortest path.

---

# A*

Optimized shortest path.

Uses heuristic.

Much faster.

---

# Real Systems

Use:

* Precomputed routes
* Traffic overlays
* ML prediction

---

# 15. 💰 Surge Pricing

One of Uber’s core business systems.

---

# Basic Idea

```text
High demand + low supply
= higher prices
```

---

# Inputs

* Ride requests
* Available drivers
* Traffic
* Weather
* Events

---

# Example

```text
surge =
 demand / supply
```

---

# Challenge

Avoid:

* price shocks
* fraud
* manipulation

---

# 16. 📡 Realtime Trip Tracking

During ride:

```text
Driver GPS updates
      ↓
Streaming pipeline
      ↓
Rider receives updates
```

---

# Technology

Usually:

* WebSockets
* gRPC streams
* MQTT

---

# Why WebSockets?

Bidirectional low-latency communication.

---

# 17. 💳 Payment System

VERY critical.

---

# Requirements

* Strong consistency
* Idempotency
* Fraud prevention

---

# Payment Flow

```text
Ride complete
      ↓
Fare finalized
      ↓
Payment gateway
      ↓
Transaction recorded
      ↓
Driver payout
```

---

# Important Concept

NEVER double charge.

Need:

* transaction IDs
* idempotency keys

---

# 18. 🚨 Critical Edge Cases

---

# Driver Disconnects Mid Trip

Need:

* reconnect handling
* trip recovery
* cached state

---

# GPS Drift

Phone GPS inaccurate.

Need:

* map matching
* smoothing algorithms

---

# Driver Accepts Two Rides

Distributed race condition.

Need:

* atomic assignment
* distributed locks

---

# Surge Exploitation

Drivers fake demand.

Need:

* anomaly detection
* anti-fraud ML

---

# Massive Concert Exit

Sudden spike:

* requests explode
* surge spikes
* matching overloaded

Need:

* queue buffering
* graceful degradation

---

# Rider Cancels While Driver Accepts

Classic distributed systems race.

Need:

* transactional state machine

---

# 19. 🧩 Ride State Machine

Very important interview concept.

---

# States

```text
REQUESTED
   ↓
MATCHING
   ↓
DRIVER_ASSIGNED
   ↓
DRIVER_ARRIVING
   ↓
TRIP_STARTED
   ↓
TRIP_COMPLETED
```

---

# Why State Machines?

Avoid inconsistent transitions.

Example:

❌ COMPLETED → MATCHING

Invalid.

---

# 20. 🌍 Multi Region Architecture

Uber is globally distributed.

Need:

* regional clusters
* low latency routing
* local failover

---

# Example

India region:

* Hyderabad
* Mumbai
* Bangalore

US region:

* Virginia
* Oregon

---

# Challenge

Cross-region coordination.

---

# 21. ⚖️ CAP Theorem

Different subsystems choose differently.

| System          | Choice |
| --------------- | ------ |
| Driver location | AP     |
| Payments        | CP     |
| Analytics       | AP     |
| Matching        | Mixed  |

---

# 22. 🧠 Event Driven Architecture

Uber is heavily event-driven.

Events:

* DriverOnline
* LocationUpdated
* RideRequested
* RideAccepted
* PaymentCompleted

---

# Why Event Driven?

Decoupling.

Example:

```text
RideCompleted
    ↓
Analytics
Notification
Billing
Fraud
ML pipeline
```

No direct coupling.

---

# 23. 📈 Analytics Pipeline

Huge importance.

Need:

* demand prediction
* ETA optimization
* fraud detection
* surge forecasting

Usually:

* Kafka
* Flink
* Spark

---

# 24. 🔥 Hotspot Problem

Airport zones.

Example:

* thousands drivers
* thousands riders

Single partition overload.

Need:

* dynamic partitioning
* load balancing

---

# 25. 🚀 Scalability Strategies

---

# Horizontal Scaling

Scale:

* API gateways
* matching workers
* geo services

---

# Partitioning

Partition by:

* city
* GeoHash
* H3 cell

---

# Caching

Use Redis for:

* active drivers
* ETA cache
* surge cache

---

# 26. 📱 Push Notification System

Needed for:

* ride requests
* trip updates
* payment alerts

Use:

* APNS
* FCM

---

# 27. 🔐 Security

Need:

* OTP verification
* encrypted payments
* fraud prevention
* device fingerprinting

---

# 28. 🧪 Tricky Interview Questions

---

## Q1. Why not SQL for live driver tracking?

Too many writes/sec.

---

## Q2. Why use GeoHash/H3?

Efficient nearby search.

---

## Q3. Why event-driven architecture?

Loose coupling + scalability.

---

## Q4. How prevent double ride assignment?

Atomic distributed state transitions.

---

## Q5. Why Redis for active drivers?

Ultra-fast geo queries.

---

## Q6. How handle millions GPS updates/sec?

Streaming systems + partitioning.

---

## Q7. Why eventual consistency acceptable for location?

Small staleness tolerated.

---

## Q8. How reduce ETA latency?

Caching + precomputed routes.

---

## Q9. Why separate matching service?

Independent scaling + isolation.

---

## Q10. What if matching service crashes?

Retry queues + reassignment.

---

# 29. 🧠 Deep Distributed Systems Concepts

---

# Sticky Sessions

Useful for:

* ride session continuity

---

# Backpressure

GPS floods can overwhelm services.

Need throttling.

---

# Idempotency

Critical in:

* payments
* ride creation

---

# Exactly Once?

Practically impossible.

Use:

* at least once
* deduplication

---

# Distributed Locks

Needed carefully.

Avoid global locking bottlenecks.

---

# 30. 📦 Complete Ride Lifecycle

```text
Rider opens app
      ↓
Nearby drivers queried
      ↓
Pickup entered
      ↓
Fare estimated
      ↓
Ride request created
      ↓
Matching service finds candidates
      ↓
Driver accepts
      ↓
Realtime trip tracking
      ↓
Trip completed
      ↓
Payment processed
      ↓
Analytics emitted
```

---

# 31. 🏗️ Final Production Architecture

```text
                  CDN
                   │
           Push Notifications
                   │
        ┌────────────────────┐
        │ API Gateway Layer  │
        └────────────────────┘
                   │
 ┌────────┬────────┬────────┬─────────┐
 │ User   │ Driver │ Match  │ Pricing │
 │ Service│ Service│ Engine │ Service │
 └────────┴────────┴────────┴─────────┘
                   │
               Kafka Bus
                   │
 ┌────────┬────────┬──────────┬────────┐
 │ GeoSvc │ ETASvc │ Analytics│ Fraud  │
 └────────┴────────┴──────────┴────────┘
                   │
        Redis + Cassandra + S3
                   │
            Multi Region Replication
```

---

# 32. 🎯 What Interviewers Evaluate

They care about:

✅ Geo spatial understanding
✅ Realtime streaming
✅ Distributed systems depth
✅ Failure handling
✅ Consistency tradeoffs
✅ Scalability intuition
✅ Event-driven architecture
✅ Partitioning strategies
✅ State machines
✅ Backpressure handling

---

# 33. 🔥 Most Important Insights

---

## Uber is fundamentally:

### 1. Realtime Geo Search Engine

Finding nearby drivers.

---

### 2. Streaming Platform

Millions GPS updates/sec.

---

### 3. Matching System

Optimizing dispatch decisions.

---

### 4. Event Driven Distributed System

Everything emits events.

---

### 5. Stateful Trip Orchestrator

Managing ride lifecycle safely.

---

# 34. 📚 Topics To Master After Uber

* GeoHash
* H3 indexing
* QuadTrees
* WebSockets
* Kafka internals
* Redis GEO
* A* routing
* Distributed locks
* Event sourcing
* CQRS
* CAP theorem
* Streaming systems
* State machines
* Backpressure
* Idempotency
* Consistent hashing
* Multi-region systems
* Flink/Spark streaming
* Traffic prediction systems
* Spatial databases

---

# 35. 📋 API Design — Beginner Friendly

Think of API as **menu in a restaurant**. Each endpoint is a dish you can order.

---

## REST Endpoints (Rider)

```text
POST   /v1/riders/register           Create account
POST   /v1/riders/login              Login (OTP)
GET    /v1/riders/:id/profile        Get profile
POST   /v1/riders/:id/payment        Add payment method
GET    /v1/riders/:id/rides          Ride history
```

## REST Endpoints (Driver)

```text
POST   /v1/drivers/online            Go online
POST   /v1/drivers/offline           Go offline
PUT    /v1/drivers/location          Update GPS
GET    /v1/drivers/:id/earnings      Earnings dashboard
```

## REST Endpoints (Ride)

```text
POST   /v1/rides                     Request ride
GET    /v1/rides/:id                 Get ride status
POST   /v1/rides/:id/cancel          Cancel ride
POST   /v1/rides/:id/rate            Rate driver/rider
GET    /v1/rides/:id/route           Get route polyline
```

## REST Endpoints (Pricing)

```text
GET    /v1/estimates/fare            Estimate fare
GET    /v1/estimates/eta             Estimate arrival time
GET    /v1/estimates/surge           Current surge multiplier
```

---

## WebSocket Messages (Realtime)

Like a walkie-talkie — both sides can talk anytime.

```text
Driver → Server:
  LOCATION_UPDATE     {lat, lng, heading, speed, timestamp}
  STATUS_CHANGE       {status: online|offline|on_trip}

Server → Rider:
  DRIVER_LOCATION     {driverId, lat, lng, heading, eta}
  RIDE_STATUS         {state, driverInfo, eta}
  SURGE_UPDATE        {multiplier}

Server → Driver:
  RIDE_REQUEST        {rideId, pickup, dropoff, fare}
  RIDE_CANCELLED      {rideId, reason}
```

---

# 36. 🔷 H3 Hexagonal Indexing Deep Dive

**Plain English**: Imagine drawing a map covered in hexagons (like a honeycomb). Every GPS point falls inside exactly one hexagon. Nearby hexagons share edges. Finding "nearby drivers" = checking same + neighboring hexagons.

---

## Why H3 Was Created

Old ways (GeoHash) use squares. Problem:

```text
Squares:
  Side neighbors: same distance
  Diagonal neighbors: farther (sqrt2 × side)

This sucks for "nearby" queries — diagonal cells are farther but look same.
```

**H3 fixes this**: all 6 neighbors of a hexagon are exactly the same distance. Much fairer.

---

## H3 Resolution Levels

Like zoom levels on a map:

| Resolution | Hexagon Avg Area | Use Case              |
| ---------- | ---------------- | --------------------- |
| 5          | ~250 km²         | Country-level         |
| 8          | ~0.74 km²        | City-level nearby     |
| 10         | ~0.015 km²       | Street-level pickup   |
| 12         | ~0.0003 km²      | Precise driver match  |
| 15         | ~3 m²            | Very precise location |

For ride-hailing: **resolution 8-10** is sweet spot.

---

## How It Works

```text
Rider at:  (37.7749, -122.4194)

Step 1: Convert → H3 cell "89283082b7bffff"
Step 2: Find neighbors (6 surrounding hexagons)
Step 3: Query Redis GEO for drivers in all 7 cells
Step 4: Sort by distance → return nearest
```

---

## Why Uber Built H3 (Not Just GeoHash)

| Feature         | GeoHash (Squares) | H3 (Hexagons)   |
| --------------- | ----------------- | ---------------- |
| Neighbor dist   | Uneven            | Uniform          |
| Cell shape      | Rectangle         | Hexagon          |
| Rotation        | Yes (90°)         | Minimal          |
| Hierarchical    | Yes (Z-order)     | Yes              |
| Uber uses       | ❌                | ✅               |

**For beginners**: Think of square tiles vs hexagonal tiles in a board game. Hexagons connect more naturally — all edges equal.

---

# 37. 🚦 Rate Limiting & Throttling

**Plain English**: Stop one person from ordering 1000 Ubers at once. Fair share for everyone.

---

## Why

```text
- Prevent bot abuse (fake ride requests)
- Stop drivers from gaming the system
- Protect backend from traffic spikes
- Ensure fair distribution
```

---

## Layers of Rate Limiting

```text
Layer 1: Global (per user)
  - Ride requests: 10/min
  - Cancel rides:  5/min
  
Layer 2: Endpoint-specific
  - GPS updates:   1/sec per driver
  - Login:         3/min
  
Layer 3: Geo-specific (hotspot prevention)
  - Max rides from same cell: threshold
  
Layer 4: Driver-side
  - Ride rejections: 5/hour (penalty if too many)
```

---

## Algorithm (Sliding Window)

Like a **subway turnstile that resets every minute**:

```text
For user X:
  Count rides in last 60 seconds
  If > 10: REJECT
  Else: ALLOW

Redis: ZCOUNT rate:rides:{userId} (now-60s, now)
```

## Response When Rate Limited

```text
HTTP: 429 Too Many Requests
      Retry-After: 30

WS:   THROTTLED {reason: "too_many_requests", retryAfterMs: 30000}
```

Driver app shows: "You've requested too many rides. Please wait..."

---

## Backpressure (Overload Protection)

**Analogy**: A busy restaurant giving out numbered tickets instead of letting everyone crowd the counter.

```text
GPS storm (10M/sec) → Kafka buffers → Consumers slow down
                         ↓
                  Backpressure signal
                         ↓
                  GPS producers pause
```

---

# 38. 📊 Observability

**Plain English**: Dashboard that shows everything happening in realtime — like a pilot's cockpit.

---

## Why It Matters for Uber

```text
If matching stops working:
  - Riders can't get rides
  - Drivers lose money
  - Bad press
  - Revenue loss ($millions/hour)
```

---

## Key Metrics

| Metric                      | What It Tells You              |
| --------------------------- | ------------------------------ |
| ride_requests_total         | How many people want rides     |
| matching_latency_ms         | How fast we find a driver      |
| match_success_rate          | % of requests that match       |
| driver_online_count         | Current available drivers      |
| gps_updates_per_sec         | System load                    |
| eta_accuracy_pct            | How accurate ETAs are          |
| surge_multiplier_avg        | Current pricing level          |
| payment_failure_rate        | % of payments failing          |
| p99_trip_tracking_latency   | Tracking lag for live trips    |

---

## Distributed Tracing (TraceID = rideId)

Each ride gets a unique ID. Follow it everywhere:

```text
Span: API Gateway → Ride Request
  Span: User Service → Validate user
  Span: Pricing Service → Calculate fare
  Span: Matching Engine → Find driver
    Span: Geo Service → Nearby query
    Span: ETA Service → Compute ETA
  Span: Push Notification → Notify driver
```

**Beginners**: Like tracking a pizza order through every kitchen station.

---

## Logging

```text
NEVER log:
  - Credit card numbers
  - Exact addresses (privacy)
  - Phone numbers plaintext

ALWAYS log:
  - rideId, driverId, riderId (anonymized)
  - timestamps, latencies
  - state transitions
  - error codes
```

---

## Alerting

What wakes up engineers at 3am:

| Condition                    | Action          |
| ---------------------------- | --------------- |
| match_success_rate < 90%     | Page on-call    |
| p99 matching > 5 seconds     | Page on-call    |
| Payment failures > 2%        | Alert           |
| GPS ingest rate drops > 20%  | Investigate     |
| Surge stuck at 1.0 (should be surging)| Investigate|

---

# 39. 🔄 Disaster Recovery

**Plain English**: What happens when a data center catches fire? How does Uber keep working?

---

## RPO/RTO (Recovery Goals)

```text
RPO (how much data can we lose?):  < 1 second
RTO (how fast to recover?):        < 60 seconds
```

Uber cannot be down 5 minutes. People are stranded.

---

## Active-Active Multi-Region

```text
┌──────────┐         ┌──────────┐
│ US-West  │ ←────→ │ US-East  │
│ (Primary)│  Kafka   │ (Standby)│
└──────────┘  Mirr  └──────────┘
     │        ing        │
   Redis ──────────── Redis
   Local    Async     Local
            replication
```

---

## Failure Scenarios

### Region Goes Down

```text
1. DNS switches to backup region
2. All new rides routed to healthy region
3. In-progress trips: drivers navigate with cached maps
4. Trip data syncs when region recovers (eventual consistency)
```

### Matching Service Crashes

```text
1. Circuit breaker trips
2. Queue all incoming requests
3. Auto-scale new matching pods
4. Replay queued requests when healthy
```

### Kafka Broker Failure

```text
1. Partition leader re-elected from ISR (in-sync replicas)
2. Producers retry with backoff
3. No data loss (if min.insync.replicas configured)
```

---

## Chaos Engineering (Deliberately Break Things)

```text
Uber runs "Chaos Monkey" experiments:
  - Kill random microservices in production
  - Simulate GPS latency spikes
  - Test what happens when Redis cluster dies
  - Validate driver gets paid even if payment service is slow
```

**For beginners**: Like fire drills — practice breaking things so you know how to fix them for real.

---

# 40. 💰 Cost Estimation

**Plain English**: How much does it cost to run Uber's backend on cloud servers?

---

## Monthly Run Rate (Cloud Estimate)

| Resource            | Unit Cost   | Qty         | Monthly     |
| ------------------- | ----------- | ----------- | ----------- |
| API Gateways        | $500/mo     | 2000        | $1M         |
| Matching Servers    | $800/mo     | 1000        | $800K       |
| Kafka Brokers       | $1000/mo    | 500         | $500K       |
| Redis Clusters      | $800/mo     | 500         | $400K       |
| Cassandra Nodes     | $1000/mo    | 1000        | $1M         |
| GeoSpatial Servers  | $800/mo     | 500         | $400K       |
| ETA/Route Compute   | $1000/mo    | 500         | $500K       |
| Object Storage      | $0.023/GB   | 10 PB/mo    | $230K       |
| CDN (maps tiles)    | $0.08/GB    | 5 PB/mo     | $400K       |
| Map Data Licensing  | custom      | global      | ~$500K      |
| SMS/OTP             | $0.005/SMS  | 500M/mo     | $2.5M       |
| Push Notifications  | ~free       | 5B/mo       | ~$0         |
| **Total**           |             |             | **~$8.2M**  |

Real costs lower — Uber operates own data centers (like Meta).

---

## Cost Breakdown Per Ride

```text
Api calls:     ~$0.002
Matching:      ~$0.001
GPS tracking:  ~$0.003
Payment fee:   ~$0.01  (2-3% of fare goes to payment processor)
SMS/OTP:       ~$0.005
Maps/ETA:      ~$0.003
Total:         ~$0.024 per ride

At 25M rides/day = $600K/day or ~$18M/month total ops cost
```

---

# 41. 🏭 Real Uber Tech Stack

**Plain English**: The actual tools Uber uses (not textbook fantasy).

---

## Backend

| Component              | Technology                |
| ---------------------- | ------------------------- |
| Primary language       | Go, Java, Python          |
| Service framework      | Peloton (in-house)        |
| Message queue          | Kafka                     |
| Realtime stream proc   | Apache Flink              |
| Geo index              | H3 (in-house)             |
| Driver location store  | Redis GEO                 |
| Trip data              | Cassandra                 |
| User accounts          | MySQL / Vitess            |
| Payment transactions   | PostgreSQL (strong CP)    |
| Cache                  | Redis / Memcached         |
| Service mesh           | Envoy                     |
| Container orchestration| Kubernetes                |
| Map rendering          | Mapbox / OpenStreetMap    |
| ML platform            | Michelangelo (in-house)   |

---

## Why This Stack Works

```text
Go:      High performance, good for API gateways
Java:    Heavy compute (matching, ETA)
Python:  ML models, analytics
Flink:   Processing GPS streams (millions/sec)
Redis:   Ultra-fast driver location lookups
Cassandra: Append-heavy trip history
MySQL:   Strong consistency for accounts
Kafka:   Everything emits events
```

---

## Key Differentiators from Textbook

```text
- Uber built its OWN geo indexing (H3) — not off-the-shelf
- Custom dispatch optimizer — ML-based, not just nearest driver
- Surge pricing system — proprietary demand/supply model
- Michelangelo — internal ML platform for predictions
- Peloton — internal microservice framework
- Self-driving data centers (not fully cloud)
- Real-time map matching algorithm (snap GPS to roads)
```

---

## Frontend

```text
Rider App: Swift (iOS) / Kotlin (Android)
Driver App: Swift (iOS) / Kotlin (Android)  
Web: React (riders.uber.com)
Maps: Mapbox GL + custom rendering
```

---

# 42. ⏰ Clock Skew & Distributed Ordering

**Plain English**: When two servers disagree on what time it is, events appear out of order. Uber must solve this.

---

## The Problem

```text
Server in New York:  12:00:00.100
Server in London:    12:00:00.050  (50ms behind)

Rider requests ride in NY at 12:00:00.080
Driver accepts in London at 12:00:00.060 (London thinks earlier!)

Without correction: acceptance logged BEFORE request → impossible state.
```

---

## Solutions Uber Uses

### 1. Server-Side Watermark Sequence

Each ride gets a monotonic sequence from the primary region:

```text
Ride: SEQ-20240522-000000001
          ↑ date    ↑ counter (global, monotonic)
```

### 2. Hybrid Logical Clocks (HLC)

Mix of physical time + counter:

```text
timestamp = (wallClockMs, logicalCounter)

Rules:
  If wall clock > last:  counter = 0
  If wall clock == last: counter++
  If wall clock < last:  counter = last.counter + 1, keep last wall time
```

### 3. NTP Everywhere

```text
- Every server has NTP daemon
- Stratum-1 time sources in each data center
- Alert if clock skew > 10ms
- Gradually slew clock — never jump (smooth adjustment)
```

---

## Split-Brain (Both Regions Think They're Primary)

**Analogy**: Two people both think they're the boss and give conflicting orders.

```text
Scenario:
  Network cable cut between US-West and US-East
  
  Both regions accept rides independently
  When cable fixed → conflicting data
  
Resolution:
  - Trip state: Last-writer-wins (by timestamp)
  - Payments: Strict serialization (one region = source of truth)
  - Driver locations: CRDT (merge-friendly — same H3 cell, stay merged)
  - Manual queue for unresolvable conflicts
```

---

# 43. 📐 Schema Registry & Event Evolution

**Plain English**: When a service changes its data format, other services must not break.

---

## Why This Matters at Uber

Uber has **1000+ microservices**. They all emit events to Kafka.

```text
RideRequested event v1: {rideId, riderId, pickupLat, pickupLng}
RideRequested event v2: {rideId, riderId, pickupLat, pickupLng, pickupAddress}

If rider-service rolls out v2 before eta-service knows about it:
  → eta-service crashes trying to deserialize unknown field
```

---

## Solution: Schema Registry

```text
Every event format registered centrally:

Producer (rider-service)
    │
    ▼
Schema Registry ←── stores Avro/Protobuf schemas
    │
    ▼
Kafka topic: ride-requests (each message has schemaId)
    │
    ▼
Consumer (eta-service) reads schemaId, fetches schema, deserializes
```

---

## Event Envelope Template

```text
Event {
  schemaId:     int           ← tells consumer which format
  eventId:      string        ← unique, for dedup
  rideId:       string        ← correlation ID
  timestamp:    int64         ← epoch ms (server time, not client!)
  eventType:    string        ← "RideRequested"
  payload:      bytes         ← actual data (Avro/Protobuf)
}
```

---

## Compatibility Rules (Simple Version)

| Change                    | Safe? | How           |
| ------------------------- | ----- | ------------- |
| Add new field (optional)  | ✅    | Consumer ignores if unknown |
| Remove existing field     | ✅    | Only if optional |
| Rename field              | ❌    | Old consumer breaks |
| Change field type         | ❌    | Deserialization fails |
| Make required → optional  | ✅    | Consumer handles missing |

**Golden rule**: Never remove or rename fields. Only add optional ones.

---

## Backfill Strategy (Updating Old Data)

```text
1. New consumer reads both v1 and v2 formats
2. Convert old v1 events → v2 using migration logic
3. Write converted events to new topic
4. Cut over all consumers to new topic
5. Delete old topic
```

---

# 44. ⚖️ Compliance & Data Retention

**Plain English**: Laws say Uber must protect your data and delete it when you ask.

---

## GDPR (Europe)

Key rights for users:

```text
Right to access:  "What data do you have on me?"
Right to delete:  "Delete my account and all data"
Right to portability: "Give me my data in a download"
Right to object:  "Stop using my data for ads"
```

---

## Uber's Implementation

### Account Deletion

```text
Step 1:  Soft delete — mark account as deleted (hide from app)
Step 2:  90 day grace period (can undo if accidental)
Step 3:  Hard delete — purge personal data from databases
Step 4:  Keep anonymized trip data for analytics (no PII)
```

### Data Export

```text
Request → Async job → ZIP file generated (can be GBs!)
Contains:
  - Trip history (pickup, dropoff, time, fare)
  - Payment history
  - Profile info
  - Support tickets

Signed download URL, expires after 7 days.
```

### Data Retention

| Data Type        | Retention | Reason                    |
| ---------------- | --------- | ------------------------- |
| Location history | 90 days   | Safety + dispute          |
| Trip records     | 7 years   | Tax/legal requirements    |
| Payment info     | 7 years   | Financial regulations     |
| Chat messages    | 30 days   | Support only              |
| Device data      | 90 days   | Fraud detection           |

---

## Data Classification

```text
PII (Personally Identifiable Information):
  - Name, phone, email → encrypted at rest
  - Payment cards → tokenized (never stored raw)
  - Exact location → anonymized after trip

Non-PII (can analyze freely):
  - Aggregate stats (avg wait time per city)
  - Anonymized traffic patterns
  - Driver earnings totals (no individual breakdown)
```

---

## Safety & Legal Data

Uber must keep some data for legal reasons:

```text
- Trip records for insurance claims
- Driver background check records
- Rider safety reports
- Accident reports

This data is stored separately with stricter access controls.
```

---

## Privacy by Design Principles

```text
1. Minimize data collection — only what's needed
2. Encrypt everything — at rest and in transit
3. Least privilege — services access only necessary data
4. Audit logs — every data access recorded
5. Anonymize analytics — no individual IDs in dashboards
```
