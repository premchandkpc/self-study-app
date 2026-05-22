import { snap } from '@/core/utils/scenarioShared';

function buildLayersSteps() {
  const steps = [];

  const s = {
    layers: [],
    events: [],
    metrics: { layers: 0, cached: 0, size: 0 },
    vars: { layer: '', hash: '', size: '0MB', cached: false },
  };

  snap(steps, s, 'Docker image build starts. Each Dockerfile instruction creates a new layer.', 1);

  const layerDefs = [
    { instruction: 'FROM ubuntu:22.04', hash: 'sha256:1a2b3c', size: '77MB', cached: true, desc: 'Base OS layer — pulled from registry.' },
    { instruction: 'RUN apt-get update && apt-get install -y nodejs', hash: 'sha256:4d5e6f', size: '120MB', cached: true, desc: 'Package install layer — uses cache if unchanged.' },
    { instruction: 'WORKDIR /app', hash: 'sha256:7g8h9i', size: '0MB', cached: true, desc: 'Working directory metadata layer.' },
    { instruction: 'COPY package.json .', hash: 'sha256:a3b2c1', size: '1MB', cached: false, desc: 'COPY invalidates cache if file changed.' },
    { instruction: 'RUN npm install', hash: 'sha256:d4e5f6', size: '145MB', cached: false, desc: 'npm install runs fresh — cache was invalidated.' },
    { instruction: 'COPY . .', hash: 'sha256:g7h8i9', size: '5MB', cached: false, desc: 'Application source code layer.' },
    { instruction: 'CMD ["node", "server.js"]', hash: 'sha256:j1k2l3', size: '0MB', cached: false, desc: 'Entry point metadata. No filesystem change.' },
  ];

  for (const def of layerDefs) {
    s.events.push({ msg: `$ ${def.instruction}`, type: 'info' });
    s.vars = { layer: def.instruction, hash: def.hash, size: def.size, cached: def.cached };
    snap(steps, s, `Processing: ${def.instruction}`, 2);

    s.layers.push({
      instruction: def.instruction,
      hash: def.hash,
      size: def.size,
      cached: def.cached,
      state: 'building',
    });
    s.metrics.layers = s.layers.length;
    if (def.cached) {
      s.metrics.cached++;
      s.events.push({ msg: `Cache HIT: ${def.hash.slice(0, 14)}`, type: 'ok' });
    } else {
      s.events.push({ msg: `Cache MISS — rebuilding layer`, type: 'warn' });
    }
    s.metrics.size += parseInt(def.size, 10);
    snap(steps, s, def.desc, 3);

    s.layers[s.layers.length - 1].state = 'done';
  }

  s.layers.forEach((l) => (l.state = 'done'));
  s.vars = { layer: 'CMD ["node","server.js"]', hash: 'sha256:j1k2l3', size: `${s.metrics.size}MB`, cached: false };
  s.events.push({ msg: `Image built: ${s.metrics.size}MB, ${s.metrics.layers} layers`, type: 'ok' });
  snap(steps, s, `Image complete! ${s.metrics.layers} layers, ${s.metrics.cached} cached, ~${s.metrics.size}MB total.`, 10);

  return steps;
}

export const LAYERS_CODE = [
  '# Dockerfile',
  'FROM ubuntu:22.04',
  '',
  'RUN apt-get update && \\',
  '    apt-get install -y nodejs npm',
  '',
  'WORKDIR /app',
  '',
  '# Copy deps first — better cache locality',
  'COPY package.json .',
  'RUN npm install',
  '',
  'COPY . .',
  'CMD ["node", "server.js"]',
  '',
  '# Build: docker build -t myapp:1.0 .',
  '# Each RUN/COPY = 1 layer',
];

export default {
  id: 'layers',
  label: 'Image Layers',
  icon: '🗂️',
  build: buildLayersSteps,
  code: LAYERS_CODE,
  language: 'Dockerfile',
  metrics: [
    { key: 'layers', label: 'Layers',  max: 10, color: 'var(--node-active)' },
    { key: 'cached', label: 'Cached',  max: 10, color: 'var(--pod-running)' },
    { key: 'size',   label: 'Size MB', max: 400, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'What are Docker image layers in simple terms?', content: 'Image layers are like a stack of tracing paper. Each Dockerfile instruction (FROM, RUN, COPY) draws on a new sheet placed on top of the previous ones. If you reuse the same bottom sheets (like FROM ubuntu), Docker does not redraw them — just adds new tracing paper on top. The final image is the entire stack viewed from above, with each layer invisible to the running container.' },
      { title: 'How Docker layers work — core mechanics', content: 'Each Dockerfile instruction creates a read-only layer stored under /var/lib/docker/overlay2. Layers use copy-on-write: when a container runs, Docker adds a thin writable layer on top of the read-only stack. Layer caching uses content hashes of the instruction text and build context — if both match a previous build, the cached layer is reused without re-execution. Cache is invalidated when COPY or ADD source files change or when RUN instruction text differs.' },
      { title: 'Deep — internals & architecture', content: 'OverlayFS merges multiple lower directories (read-only layers) with one upper directory (writable container layer) into a single unified view presented to the container. Reads check the upper layer first and fall through to lower layers on miss — this is the copy-on-write mechanism. When a container modifies a file from a lower layer, OverlayFS copies the entire file to the upper layer before applying the write (copy-up operation), leaving the original layer completely untouched. Deletions create whiteout entries (character device 0,0) in the upper layer that hide the file from the merged view without modifying the read-only base layer. This is why deleting a 100MB file from a container does not reclaim disk space from the image.' },
    ],
    why: [
      'Order Dockerfile instructions from least-to-most frequently changing (OS packages first, then language dependencies, then application code). A single cache miss at any layer invalidates all subsequent layers, so placing code before npm install means every code change triggers a full dependency reinstall.',
      'Always use `.dockerignore` to exclude node_modules, .git, build artifacts, and other unnecessary files from the Docker build context. Without it, Docker sends the entire directory to the daemon, slowing builds and causing cache misses on COPY . . when irrelevant files change.',
      'Combine RUN instructions for related operations into a single layer: `RUN apt-get update && apt-get install -y pkg1 pkg2 && rm -rf /var/lib/apt/lists/*`. This keeps the layer small by cleaning up within the same instruction and prevents stale package lists in cached intermediate layers.',
    ],
    interview: [
      { q: 'What happens to a RUN layer when its command string changes between builds?', a: 'Docker computes a content hash of the RUN instruction string and the build context. If the hash differs from the cached layer, that RUN instruction is re-executed fresh. Critically, Docker also invalidates every subsequent layer in the Dockerfile — cache is all-or-nothing from the point of change forward. The previous layer still exists in the local layer cache as a dangling layer but is not referenced by the new image. This is why you should put frequently changing instructions at the end of the Dockerfile.', followUps: ['How does COPY cache invalidation differ from RUN cache invalidation?', 'Can you use --no-cache or --cache-from to control caching behavior?', 'What happens to the cache when you change an ENV or ARG instruction?'] },
      { q: 'How does Docker share identical layers between different images?', a: 'Layers are content-addressed by their content hash (digest). If two images share the same base layer — for example, both FROM ubuntu:22.04 — Docker stores the base layer only once on disk regardless of how many images reference it. This is the fundamental mechanism behind multi-stage builds: intermediate stages generate layers that are discarded in the final image, but you can COPY artifacts across stages without bloat because only the final stage\'s layers are saved. Docker also shares layers across tags of the same image when only the tag metadata differs.', followUps: ['What is a dangling layer and how does it form?', 'How does `docker system prune` clean up unused shared layers?', 'Can you manually push shared layers to a registry to speed up CI?'] },
      { q: 'How does OverlayFS handle file modifications and deletions across read-only layers at the kernel level?', a: 'When a container modifies a file residing in a read-only lower layer, OverlayFS triggers a copy-up operation: the entire file content is copied from the lower layer to the writable upper layer and the modification is applied there. The original file in the lower layer remains completely unchanged and still contributes to the image size. For deletions, OverlayFS creates a whiteout entry in the upper layer — a character device with major/minor number 0/0 that acts as a visibility mask. The masked file still physically exists in the lower layer and still consumes disk space. This is why deleting a 100MB database file from a running container does not reclaim 100MB from the image: the underlying layer still contains the full file.', followUps: ['What is the performance impact of copy-up on large files?', 'How does OverlayFS handle directories (opaque whiteouts)?', 'Can you inspect which layer contains a specific file using docker history?'] },
    ],
    gotcha: [
      'COPY . . placed early in the Dockerfile invalidates the cache on every file change, causing subsequent instructions (npm install, build) to re-run even when package.json is unchanged. Always COPY in dependency order: package.json and package-lock.json first, then `npm install`, then COPY the rest of the source.',
      'A high layer count does not degrade performance on overlay2 — the Linux kernel merges layers efficiently. Multi-stage builds reduce final image size, not build speed. Do not sacrifice Dockerfile readability solely to reduce layer count.',
      '`ADD` has surprising automatic behaviors: it can fetch remote URLs and auto-extract tar archives. These features can cause unexpected cache misses when remote content changes, and URL fetches are not cached by Docker. Use `COPY` by default and only `ADD` when you specifically need tar extraction.',
      'Each RUN layer captures the entire filesystem diff — not just the command output. A RUN that generates 1GB of temporary files and then removes them still creates a 1GB layer (the removal becomes a separate layer). Chain cleanup into the same RUN instruction: `RUN command && rm -rf /tmp/*` so the temp files never appear in any layer.',
    ],
    tradeoffs: [
      { pro: 'Layer caching dramatically accelerates CI/CD builds by reusing unchanged layers. In practice this means 90%+ cache hit rates for well-structured Dockerfiles, reducing build times from minutes to seconds.', con: 'Cache invalidation is all-or-nothing from the point of change — a single changed ENV or COPY at line 3 invalidates everything after it. This makes Docker build times sensitive to instruction order in ways that surprise new users.' },
      { pro: 'Content-addressed layer sharing conserves disk space and network bandwidth. The base ubuntu:22.04 layer (~77MB) is stored once regardless of how many images use it, and is pulled from the registry only once per host.', con: 'Per-layer manifest overhead adds latency to push and pull operations. While overlay2 handles many layers efficiently, registries still process each layer independently, and pushing a 50-layer image requires 50 separate HTTP PUT requests.' },
      { pro: 'Copy-on-write via OverlayFS enables near-instant container startup from a shared base image — no files are duplicated until the container actually writes, minimizing both disk usage and startup latency.', con: 'Copy-on-write amplifies write amplification for large file modifications. A single byte write to a 1GB file in a lower layer triggers a full 1GB copy-up operation to the upper layer, causing unexpected I/O spikes and latency in write-heavy workloads.' },
    ],
  },
};
