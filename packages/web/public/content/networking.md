# 🌐 Networking Fundamentals — DNS & TLS Deep Dive

Understanding DNS resolution and TLS handshake is foundational to networking. Every web request depends on both.

---

# 1. 🧠 DNS Resolution Chain

Domain Name System (DNS) translates human-readable domain names into machine-routable IP addresses. Every lookup follows a hierarchical chain:

```text
Browser
    ↓
Browser Cache
    ↓
OS Resolver (/etc/hosts, nscd)
    ↓
Local DNS Resolver (ISP / 8.8.8.8)
    ↓
Root Nameserver
    ↓
TLD Nameserver (.com)
    ↓
Authoritative Nameserver (example.com)
    ↓
IP address (93.184.216.34)
```

## Browser Cache

Browser checks its local DNS cache first. If TTL has expired → cache miss. Browsers cache DNS results aggressively (usually 60-300s depending on TTL). Chrome: `chrome://net-internals/#dns`.

## OS Resolver

OS checks `/etc/hosts` file and system DNS cache (nscd/systemd-resolved). Override hostnames locally. macOS: `scutil --dns`. Linux: `resolvectl query example.com`.

## Local DNS Resolver

ISP's recursive resolver or public DNS (8.8.8.8, 1.1.1.1). Does the heavy lifting — walks the DNS hierarchy recursively. Caches results according to TTL. Public resolvers have massive shared caches (Google: 8.8.8.8 serves billions).

## Root Nameserver

13 logical root clusters (lettered A-M), ~1500 physical instances worldwide. Operated by Verisign, ICANN, USC, NASA, etc. They don't know individual domain IPs — they only know "who manages .com".

## TLD Nameserver

Top-Level Domain servers (.com, .org, .net, .io, etc.). Operated by registries (Verisign for .com/.net). They know which nameservers are authoritative for a given domain.

## Authoritative Nameserver

The final answer — managed by DNS provider (Route53, CloudFlare, etc.). Returns the actual A/AAAA/CNAME record with TTL. Result is cached at every level → subsequent lookups are near-instant.

### Record Types

| Type | Purpose | Example |
|------|---------|---------|
| A | IPv4 address | 93.184.216.34 |
| AAAA | IPv6 address | 2606:2800:220:: |
| CNAME | Canonical alias | www → example.com |
| MX | Mail exchange | mail.example.com |
| TXT | Arbitrary text | SPF, DKIM, verification |
| NS | Nameserver record | ns1.route53.com |

### TTL Mechanics

TTL controls how long each cache level holds the record. Short TTL (60s) → faster updates, more queries, higher cost. Long TTL (3600s) → fewer queries, cheaper, slower propagation.

```text
Client → Browser Cache (300s)
                   ↓ miss
              OS Resolver (300s)
                   ↓ miss
           ISP Recursive (300s)
                   ↓ miss
           Root Name Server
                   ↓ .com NS
           .com TLD Server
                   ↓ Auth NS
           Authoritative NS
                   ↓ A record
           Cached at all levels
```

---

# 2. 🔒 TLS Handshake

Transport Layer Security (TLS) provides encrypted communication over TCP. TLS 1.2 is the most widely deployed version; TLS 1.3 reduces round trips.

```text
Client                                         Server
  |                                               |
  | 1. ClientHello                                |
  |    TLS 1.2, cipher suites, random             |
  |----------------------------------------------→|
  |                                               |
  | 2. ServerHello                                |
  |    TLS 1.2, TLS_ECDHE_RSA_WITH_AES_128_GCM   |
  |←----------------------------------------------|
  |                                               |
  | 3. Certificate                                |
  |    X.509 chain (RSA 2048, ~2.4 KB)           |
  |←----------------------------------------------|
  |                                               |
  | 4. ServerKeyExchange                          |
  |    ECDHE params + signature                   |
  |←----------------------------------------------|
  |                                               |
  | 5. ClientKeyExchange                          |
  |    ECDHE public key                           |
  |----------------------------------------------→|
  |                                               |
  | 6. ChangeCipherSpec + Finished                |
  |    🔒 Encrypted handshake verify              |
  |----------------------------------------------→|
  |                                               |
  | 7. ChangeCipherSpec + Finished                |
  |    🔒 Encrypted handshake verify              |
  |←----------------------------------------------|
  |                                               |
  | 8. Application Data                           |
  |    🔒 Encrypted HTTP GET /                    |
  |↔---------------------------------------------|
  |                                               |
```

## Phase 1: Hello

**ClientHello**: Client sends supported TLS version (1.2), cipher suites (AES-GCM, ChaCha20, etc.), 32-byte random, optional session ID for resumption.

**ServerHello**: Server picks the strongest mutually supported cipher suite, sends its own random, session ID. Negotiation complete.

## Phase 2: Server Auth & Key Exchange

**Certificate**: Server sends X.509 certificate chain (leaf → intermediate → root). Client validates against trusted CA store. Chain size: 2-4 KB typical (RSA 2048). ECDSA certs are smaller (~300 bytes).

**ServerKeyExchange**: For ECDHE (Ephemeral Diffie-Hellman): server sends its ECDHE public key and signature (signed by certificate's private key). Client verifies signature using server's public key from the certificate.

**ServerHelloDone**: Server signals it's done sending handshake messages.

## Phase 3: Client Key Exchange

**ClientKeyExchange**: Client sends its ECDHE public key. Both sides now compute the same pre-master secret using ECDHE key agreement. Perfect Forward Secrecy: even if server's long-term private key is compromised, past sessions cannot be decrypted.

Both sides derive: pre-master secret → master secret → session keys (client write, server write, IVs).

## Phase 4: Secure Connection Established

**ChangeCipherSpec**: Signals that subsequent records will be encrypted with the negotiated keys.

**Finished**: Encrypted hash of all handshake messages. Both sides verify integrity — if any message was tampered with, the hash won't match and handshake fails.

## Application Data

Now both sides send encrypted HTTP. TLS record layer: each record up to 16 KB plaintext, compressed (optional), encrypted with AES-GCM (adds tag). Sequence numbers prevent replay.

### TLS 1.3 Improvements

TLS 1.3 reduces handshake from 2 RTT to 1 RTT (or 0-RTT with resumption):

```text
Client                                          Server
  |                                                |
  | ClientHello (key_share, supported_versions)    |
  |-----------------------------------------------→|
  |                                                |
  | ServerHello + EncryptedExtensions              |
  | + Certificate + CertificateVerify + Finished   |
  |←-----------------------------------------------|
  |                                                |
  | Client Finished                                |
  |-----------------------------------------------→|
  |                                                |
  | Application Data                               |
  |↔----------------------------------------------|
```

Removes static RSA key exchange, weak ciphers, compresses handshake to 1 round trip.

### Cipher Suite Anatomy

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
  ↕        ↕              ↕           ↕
TLS   KeyExchange   Auth   Cipher     MAC/Hash
```

- **Key Exchange**: ECDHE (forward secrecy), DHE, RSA (deprecated)
- **Authentication**: RSA (sign), ECDSA (sign), PSK (pre-shared)
- **Cipher**: AES-128-GCM, AES-256-GCM, ChaCha20-Poly1305
- **Hash**: SHA-256, SHA-384

### Tools

```bash
# Inspect TLS connection
openssl s_client -connect example.com:443 -tls1_2

# View certificate chain
echo | openssl s_client -showcerts -connect example.com:443 2>/dev/null

# Test TLS 1.3
openssl s_client -connect example.com:443 -tls1_3

# List supported cipher suites
openssl ciphers -v 'TLSv1.2'
```
