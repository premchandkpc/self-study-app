import { snap } from './shared';

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
};
