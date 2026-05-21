import { snap } from '@/core/utils/scenarioShared';

function buildGrpcSteps() {
  const steps = [];

  const s = {
    client: { name: 'Client', state: 'idle', requests: 0, responses: 0, streams: [] },
    server: { name: 'Server', state: 'idle', processing: 0, handlers: 0 },
    connection: { state: 'closed', protocol: 'HTTP/2', streams: 0 },
    messages: [],
    rpc: { name: '', type: '', latency: 0, status: '' },
    metrics: { requests: 0, latency: 0, throughput: 0, activeStreams: 0 },
    events: [],
    vars: { callType: 'unary', streaming: false, latency: 0, status: 'idle' },
  };

  snap(steps, s, 'gRPC: Google Remote Procedure Call. Modern RPC framework over HTTP/2. Client ↔ Server communication with protocol buffers.', 1, 'gRPC init');

  // === CONNECTION SETUP ===
  s.events.push({ type: 'info', msg: 'Client creates connection to server' });
  s.connection.state = 'establishing';
  snap(steps, s, 'Step 1 — Establish Connection: Client initiates HTTP/2 connection to Server (address: localhost:50051).', 2, 'HTTP/2 handshake');

  s.connection.state = 'established';
  s.connection.streams = 1;
  s.events.push({ type: 'success', msg: 'HTTP/2 connection established' });
  snap(steps, s, 'HTTP/2 connection established! Multiplexing enabled. Can handle multiple concurrent RPC calls on same connection.', 3, 'Connection ready');

  // === UNARY RPC (REQUEST-RESPONSE) ===
  s.rpc = { name: 'GetUser', type: 'unary', latency: 0, status: 'calling' };
  s.client.requests = 1;
  s.events.push({ type: 'info', msg: 'Client calls GetUser(user_id: 42)' });
  s.vars = { callType: 'unary', streaming: false, latency: 0, status: 'calling' };
  snap(steps, s, 'RPC 1 — Unary Call: Client calls GetUser(user_id=42). Message encoded in protobuf. Sent over HTTP/2 stream.', 4, 'Unary RPC');

  s.server.processing = 1;
  s.events.push({ type: 'info', msg: 'Server receives and processes request' });
  snap(steps, s, 'Server receives GetUser request. Executes handler: queries database, returns User{id: 42, name: "Alice", email: "alice@example.com"}.', 5, 'Server processing');

  s.client.responses = 1;
  s.rpc.latency = 150;
  s.rpc.status = 'done';
  s.metrics.latency = 150;
  s.events.push({ type: 'success', msg: 'Client receives response in 150ms' });
  s.vars = { callType: 'unary', streaming: false, latency: 150, status: 'done' };
  snap(steps, s, 'Client receives response: User{id: 42, name: "Alice", ...}. Latency: 150ms. One request-response cycle complete!', 6, 'Unary done');

  // === SERVER STREAMING ===
  s.rpc = { name: 'ListUsers', type: 'server-streaming', latency: 0, status: 'calling' };
  s.client.requests = 2;
  s.events.push({ type: 'info', msg: 'Client calls ListUsers() with server streaming' });
  s.vars = { callType: 'server-streaming', streaming: true, latency: 0, status: 'calling' };
  snap(steps, s, 'RPC 2 — Server Streaming: Client calls ListUsers(). Server will send multiple users in a stream (not all at once).', 7, 'Server streaming');

  s.server.processing = 2;
  snap(steps, s, 'Server starts streaming response. Sends first batch of 5 users. Stream remains open.', 8, 'Stream batch 1');

  s.client.responses = 2;
  s.metrics.activeStreams = 1;
  s.events.push({ type: 'info', msg: 'Client receives batch 1: 5 users' });
  snap(steps, s, 'Client receives first batch: {user1, user2, user3, user4, user5}. Stream still open for more.', 9, 'Batch 1 rcv');

  s.server.processing = 3;
  snap(steps, s, 'Server sends batch 2: 5 more users. Total sent: 10 users. Stream continues.', 10, 'Stream batch 2');

  s.client.responses = 3;
  s.events.push({ type: 'info', msg: 'Client receives batch 2: 5 more users' });
  snap(steps, s, 'Client receives batch 2: {user6, user7, user8, user9, user10}. Stream still open.', 11, 'Batch 2 rcv');

  s.rpc.latency = 320;
  s.rpc.status = 'done';
  s.metrics.latency = 320;
  s.events.push({ type: 'success', msg: 'Stream complete. Server sent EOF' });
  s.vars = { callType: 'server-streaming', streaming: true, latency: 320, status: 'done' };
  snap(steps, s, 'Server sends EOF (end-of-stream marker). Client completes! Total latency: 320ms. Received 10 users in 2 batches.', 12, 'Server streaming done');

  // === CLIENT STREAMING ===
  s.rpc = { name: 'RecordEvents', type: 'client-streaming', latency: 0, status: 'calling' };
  s.client.requests = 3;
  s.events.push({ type: 'info', msg: 'Client streams events to server' });
  s.vars = { callType: 'client-streaming', streaming: true, latency: 0, status: 'calling' };
  snap(steps, s, 'RPC 3 — Client Streaming: Client streams multiple events to server. Server accumulates, responds once with summary.', 13, 'Client streaming');

  s.server.processing = 4;
  const events = ['event1', 'event2', 'event3', 'event4', 'event5'];
  for (let i = 0; i < events.length; i++) {
    s.events.push({ type: 'info', msg: `Client sends ${events[i]}` });
    s.client.requests = 3 + i + 1;
    snap(steps, s, `Client sends event ${i+1}/5: {timestamp, userId, action}. Server accumulates in memory.`, 14 + i, 'Event sent');
  }

  s.rpc.latency = 450;
  s.rpc.status = 'done';
  s.metrics.latency = 450;
  s.events.push({ type: 'success', msg: 'Server responds with summary' });
  s.client.responses = 4;
  s.vars = { callType: 'client-streaming', streaming: true, latency: 450, status: 'done' };
  snap(steps, s, 'After receiving all events, server responds: {recordedCount: 5, status: "OK"}. Latency: 450ms. Client streaming complete!', 19, 'Client streaming done');

  // === BIDIRECTIONAL STREAMING ===
  s.rpc = { name: 'Chat', type: 'bidirectional', latency: 0, status: 'calling' };
  s.client.requests = 8;
  s.events.push({ type: 'info', msg: 'Client and server stream messages bidirectionally' });
  s.metrics.activeStreams = 2;
  s.vars = { callType: 'bidirectional', streaming: true, latency: 0, status: 'calling' };
  snap(steps, s, 'RPC 4 — Bidirectional Streaming: Client and server send/receive messages simultaneously (full duplex).', 20, 'Bidirectional start');

  s.events.push({ type: 'info', msg: 'Client sends message 1' });
  snap(steps, s, 'Client sends: "Hello, server!". Message #1 in flight on stream.', 21, 'Msg 1 sent');

  s.events.push({ type: 'info', msg: 'Server responds immediately' });
  snap(steps, s, 'Server receives and echoes: "Hello, client!" + timestamp. Both sides can send/receive concurrently!', 22, 'Msg 1 rcv');

  s.events.push({ type: 'info', msg: 'Client sends message 2' });
  snap(steps, s, 'Client sends: "How are you?". Server processes in parallel.', 23, 'Msg 2 sent');

  s.rpc.latency = 500;
  s.rpc.status = 'done';
  s.metrics.latency = 500;
  s.client.responses = 5;
  s.events.push({ type: 'success', msg: 'Both sides send EOF. Stream ends.' });
  s.vars = { callType: 'bidirectional', streaming: true, latency: 500, status: 'done' };
  snap(steps, s, 'Both client and server close stream. Total messages exchanged: 6. Latency: 500ms. True full-duplex communication!', 24, 'Bidirectional done');

  // === CONNECTION CLOSE ===
  s.connection.state = 'closed';
  s.events.push({ type: 'info', msg: 'Connection closed gracefully' });
  snap(steps, s, 'Connection closed. Reusable: create new RPCs on same connection. New connections auto-reuse for multiple calls.', 25, 'Connection closed');

  // === SUMMARY ===
  s.metrics.requests = 8;
  s.metrics.throughput = 8;
  snap(steps, s, 'gRPC Summary: 4 RPC calls (Unary, Server-Stream, Client-Stream, Bidirectional). Total requests: 8. HTTP/2 multiplexing enabled. Avg latency: 305ms. Protocol: Protocol Buffers (binary, compact).', 26, 'gRPC summary');

  return steps;
}

export const GRPC_CODE = [
  '// Proto definition (service.proto)',
  'syntax = "proto3";',
  '',
  'service UserService {',
  '  rpc GetUser (GetUserRequest) returns (User);',
  '  rpc ListUsers (ListUsersRequest) returns (stream User);',
  '  rpc RecordEvents (stream Event) returns (RecordSummary);',
  '  rpc Chat (stream Message) returns (stream Message);',
  '}',
  '',
  'message User {',
  '  int32 id = 1;',
  '  string name = 2;',
  '  string email = 3;',
  '}',
  '',
  '// Go server implementation',
  'func (s *Server) GetUser(ctx context.Context, req *GetUserRequest) (*User, error) {',
  '  user := &User{Id: req.Id, Name: "Alice", Email: "alice@example.com"}',
  '  return user, nil',
  '}',
  '',
  'func (s *Server) ListUsers(req *ListUsersRequest, stream UserService_ListUsersServer) error {',
  '  for i := 1; i <= 10; i++ {',
  '    user := &User{Id: int32(i), Name: fmt.Sprintf("User%d", i)}',
  '    stream.Send(user)  // Stream response',
  '  }',
  '  return nil',
  '}',
  '',
  '// Client usage',
  'conn, _ := grpc.Dial("localhost:50051")',
  'client := NewUserServiceClient(conn)',
  'user, _ := client.GetUser(context.Background(), &GetUserRequest{Id: 42})',
];

export default {
  id: 'grpc',
  label: 'gRPC',
  icon: '📡',
  build: buildGrpcSteps,
  code: GRPC_CODE,
  language: 'go',
  metrics: [
    { key: 'requests', label: 'Total Requests', max: 10, color: 'var(--node-comparing)' },
    { key: 'latency', label: 'Latency (ms)', max: 500, color: 'var(--node-active)', warn: 300, critical: 400 },
    { key: 'throughput', label: 'Requests/sec', max: 10, color: 'var(--kafka-producer)' },
    { key: 'activeStreams', label: 'Active Streams', max: 4, color: 'var(--node-success)' },
  ],
};
