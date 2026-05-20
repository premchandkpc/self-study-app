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
      { title: 'ELI5 — Kid-friendly analogy', content: 'Image layers are like a stack of tracing paper. Each Dockerfile instruction draws on a new sheet. If you reuse the same bottom sheets (FROM, RUN apt-get), Docker doesn\'t redraw them — just puts new tracing paper on top. The final image is the stack viewed from above.' },
      { title: 'Core — How it works', content: 'Each Dockerfile instruction creates a read-only layer stored in /var/lib/docker/overlay2. Layers use copy-on-write: when a container runs, a thin writable layer is added. Layer caching uses content hashes — if the instruction text and context hash match a previous build, the cached layer is reused. Cache is invalidated when COPY/ADD file content changes or RUN instructions change.' },
    ],
    why: ['Order Dockerfile instructions from least-to-most frequently changing (deps before code) to maximize cache hits. A single cache miss invalidates all subsequent layers — rebuilds are much slower.'],
    interview: [
      { question: 'What happens to a RUN instruction\'s layer when its command changes?', answer: 'The cache is invalidated for that RUN and every subsequent instruction. Docker hashes the command string. If it differs from the cached layer\'s instruction, Docker runs it fresh. The previous layer still exists but is unused in the new image.', followUps: ['How does COPY cache invalidation differ?', 'Can you force a cache miss?'] },
      { question: 'How does Docker share layers between images?', answer: 'Layers are content-addressed by digest. If two images share the same base layer (e.g., FROM ubuntu:22.04), Docker stores one copy on disk. That\'s why multi-stage builds can copy artifacts between stages without bloat — only the final stage\'s layers are saved.', followUps: ['What is a dangling layer?', 'How do you clean up unused layers?'] },
    ],
    gotcha: ['COPY . . invalidates the cache on every file change. Always COPY files in dependency-order: package.json first, then `npm install`, then source. This way npm install is cached until deps change.', 'Layer count is not a performance concern on modern storage (overlay2). Merge them with multi-stage builds to reduce final image size, not for speed.'],
    tradeoffs: [
      { pro: 'Layer caching drastically speeds up CI/CD rebuilds', con: 'Cache invalidation can cause unexpectedly long builds if instructions are poorly ordered' },
      { pro: 'Shared layers save disk space across images', con: 'Too many layers can slow `docker push/pull` on older storage drivers (aufs, devicemapper)' },
    ],
  },
};
