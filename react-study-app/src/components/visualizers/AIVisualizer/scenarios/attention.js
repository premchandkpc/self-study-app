import { snap } from '@/core/utils/scenarioShared';

function buildAttentionSteps() {
  const steps = [];

  const s = {
    tokens: [],
    query: [],
    key: [],
    value: [],
    scores: [],
    attentionWeights: [],
    events: [],
    metrics: { tokens: 0, attnHeads: 0, dModel: 0, maxScore: 0 },
    vars: { phase: '', d_k: 64, n_heads: 8, scale: 1 / Math.sqrt(64) },
  };

  snap(steps, s, 'Attention: maps query-key-value triples to weighted sums. Core of transformer.', 1);

  s.tokens = [
    { id: 0, text: 'I' },
    { id: 1, text: 'love' },
    { id: 2, text: 'machine' },
    { id: 3, text: 'learning' },
  ];
  s.metrics.tokens = 4;
  s.metrics.dModel = 512;
  s.vars = { phase: 'Input tokens', d_k: 64, n_heads: 8, scale: 0.125 };
  s.events.push({ msg: 'Input: "I love machine learning" (4 tokens)', type: 'info' });
  snap(steps, s, 'INPUT: 4 tokens. Each projected to Query, Key, Value (Q/K/V) vectors of dimension d_k=64.', 1);

  s.query = [[1.0, 0.2], [0.5, 0.8], [0.3, 0.1], [0.9, 0.6]];
  s.key = [[0.8, 0.3], [0.4, 0.7], [0.2, 0.5], [0.6, 0.9]];
  s.value = [[0.1, 0.4], [0.7, 0.2], [0.5, 0.8], [0.3, 0.6]];
  s.vars = { phase: 'Q/K/V projections', d_k: 2, n_heads: 8, scale: 0.707 };
  s.events.push({ msg: 'Each token projected to Q, K, V using learned weight matrices', type: 'info' });
  snap(steps, s, 'LINEAR PROJECTION: Each token embedded in 512-dim → projected to Q, K, V (64-dim each). For 8 heads: each gets 64-dim.', 2);

  s.scores = [
    [1.2, 0.8, 0.3, 0.5],
    [0.4, 1.5, 0.6, 0.2],
    [0.1, 0.3, 0.9, 0.7],
    [0.6, 0.2, 0.4, 1.3],
  ];
  s.vars = { phase: 'Dot-product scores', d_k: 2, n_heads: 8, scale: 0.707 };
  s.events.push({ msg: 'Q · K^T computed. Score matrix 4×4.', type: 'info' });
  snap(steps, s, 'SCORES: Q · K^T / sqrt(d_k). Dot product measures similarity. Division by sqrt(64) prevents softmax saturation.', 3);

  s.attentionWeights = [
    [0.52, 0.28, 0.10, 0.10],
    [0.15, 0.65, 0.12, 0.08],
    [0.08, 0.12, 0.55, 0.25],
    [0.18, 0.10, 0.15, 0.57],
  ];
  s.metrics.maxScore = 0.65;
  s.vars = { phase: 'Softmax attention weights', d_k: 2, n_heads: 8, scale: 0.707 };
  s.events.push({ msg: 'Softmax normalizes scores → row sums = 1.0', type: 'ok' });
  snap(steps, s, 'SOFTMAX: Row-wise softmax converts scores to probabilities. Each token now has weighted attention over all tokens.', 4);

  s.vars = { phase: 'Weighted sum', d_k: 2, n_heads: 8, scale: 0.707 };
  s.events.push({ msg: 'Attention weights × Value → context vectors', type: 'info' });
  snap(steps, s, 'WEIGHTED SUM: attention_weights · V. Each token output is a weighted combination of all values. Model learns what to focus on.', 5);

  s.vars = { phase: 'Multi-head concat + project', d_k: 2, n_heads: 8, scale: 0.707 };
  s.events.push({ msg: '8 heads concatenated (8×64=512). Projected via W_O to 512-dim.', type: 'info' });
  s.events.push({ msg: 'Final: each token has context-aware representation', type: 'ok' });
  snap(steps, s, 'MULTI-HEAD CONCAT: All 8 heads concatenated and linearly projected. Each token now contains context from all other tokens.', 6);

  return steps;
}

export const ATTENTION_CODE = [
  'def attention(query, key, value, mask=None):',
  '    """Scaled dot-product attention."""',
  '    d_k = query.size(-1)',
  '    scores = torch.matmul(query, key.transpose(-2, -1))',
  '    scores = scores / math.sqrt(d_k)  # scale',
  '',
  '    if mask is not None:',
  '        scores = scores.masked_fill(mask == 0, -1e9)',
  '',
  '    attn_weights = F.softmax(scores, dim=-1)',
  '    output = torch.matmul(attn_weights, value)',
  '    return output, attn_weights',
  '',
  '# Multi-head: split d_model into n_heads * d_k',
  '# head i: Q_i, K_i, V_i each d_k-dim',
];

export default {
  id: 'attention',
  label: 'Attention',
  icon: '\U0001f441\ufe0f',
  build: buildAttentionSteps,
  code: ATTENTION_CODE,
  language: 'python',
  metrics: [
    { key: 'tokens', label: 'Tokens', max: 20, color: 'var(--node-active)' },
    { key: 'attnHeads', label: 'Heads', max: 16, color: 'var(--kafka-producer)' },
    { key: 'dModel', label: 'd_model', max: 1024, color: 'var(--pod-running)' },
    { key: 'maxScore', label: 'Max Attn', max: 1, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'Attention is like a spotlight on a stage. When I say "the cat sat on the mat", the word "sat" shines a spotlight on "cat" (who did the sitting) and "mat" (where they sat). The brighter the spotlight, the more that word influences the meaning. Multi-head attention = multiple spotlights of different colors, each looking for different things.' },
      { title: 'Core — How it works', content: 'Scaled dot-product attention: each token is projected into Query (what am I looking for?), Key (what features do I have?), and Value (what information do I carry?). Attention scores = softmax(Q·K^T / √d_k). Output = scores · V. Each head projects into lower-dimension d_k. Concatenated and re-projected to d_model.' },
    ],
    why: ['Attention mechanisms solved the bottleneck of fixed-length context vectors in seq2seq models. They allow the model to dynamically focus on relevant parts of the input, enabling superior translation, summarization, and generation.'],
    interview: [
      { question: 'What is the difference between self-attention and cross-attention?', answer: 'Self-attention: Q, K, V all come from the same sequence. Each token attends to all others in the same input. Cross-attention: Q from one sequence (e.g., decoder), K and V from another (e.g., encoder output). Used in seq2seq to let decoder focus on encoder states.', followUps: ['Where is cross-attention used in transformers?', 'What about causal self-attention?'] },
      { question: 'Why multi-head attention instead of a single head?', answer: 'A single attention head averages over all information, diluting specific patterns. Multiple heads allow the model to attend to different subspaces: one head might focus on syntax, another on semantics, another on position. Each head has its own Q, K, V projections, learned independently.', followUps: ['What happens if you increase heads beyond d_model/d_k?', 'Do heads learn interpretable patterns?'] },
    ],
    gotcha: ['Attention weights are often misinterpreted as "importance" or "explanation". They show what the model looked at, but not why. Attention distributions can be manipulated without affecting model predictions.', 'The mask in attention must be -inf (or a large negative) before softmax, not 0. Masking with 0 still allows the position to contribute because exp(0) = 1.'],
    tradeoffs: [
      { pro: 'Full attention — each token sees all others, maximal expressivity', con: 'O(n²) compute and memory, impractical for long sequences' },
      { pro: 'Sparse/linear attention — O(n) or O(n log n), scales to long docs', con: 'reduced expressivity, harder to implement efficiently on hardware' },
    ],
  },
};
