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
      { title: 'What is attention in simple terms?', content: 'Attention is a mechanism that lets a model focus on relevant parts of the input when producing each output. When reading "the cat sat on the mat", the model learns that "sat" should pay attention to "cat" (who sat) and "mat" (where). It computes a weighted sum of all input elements, where the weights represent relevance. This is like highlighting important words in a sentence.' },
      { title: 'How attention works — core mechanics', content: 'Each token is projected into three vectors: Query (what am I looking for?), Key (what features do I have?), and Value (what information do I carry?). Attention scores are computed as the dot product of every Query with every Key, divided by √d_k to prevent softmax saturation. Softmax converts scores into probabilities (attention weights). The output is the weighted sum of Values — each token output is a mixture of information from all tokens, weighted by relevance.' },
      { title: 'Deep — internals & architecture', content: 'Multi-head attention runs the attention mechanism h times in parallel (typically h=8 or h=12), each with its own learned Q, K, V projections into d_k = d_model/h dimensions. Different heads learn different attention patterns — one might focus on syntactic relationships (subject-verb), another on position (nearby tokens), another on semantic similarity. The outputs are concatenated and linearly projected back to d_model. This is formalized as MultiHead(Q,K,V) = Concat(head_1,...,head_h)·W_O where head_i = Attention(Q·W_Q_i, K·W_K_i, V·W_V_i).' },
    ],
    why: [
      'Attention mechanisms solved the bottleneck of fixed-length context vectors in seq2seq models (RNNs). They allow the model to dynamically focus on relevant parts of the input, enabling superior translation, summarization, and generation by preserving information across arbitrary distances.',
      'Every modern AI system — from GPT-4 to Stable Diffusion to AlphaFold — uses attention mechanisms. The transformer architecture built entirely on attention has become the universal building block of deep learning.',
      'Attention provides interpretability: attention weights can be visualized to understand what the model focuses on. This is critical for debugging model behavior, detecting bias, and building trust in AI systems deployed in production.',
    ],
    interview: [
      { q: 'What is the difference between self-attention and cross-attention?', a: 'Self-attention computes Q, K, and V all from the same sequence — each token attends to every other token in the same input. Cross-attention takes Q from one sequence (e.g., the decoder\'s output) and K, V from another sequence (e.g., the encoder\'s output). Cross-attention is used in encoder-decoder architectures to let the decoder focus on relevant parts of the encoder\'s representation. GPT uses only self-attention (decoder-only), while T5 uses both self-attention and cross-attention.', followUps: ['Where is cross-attention used in the transformer architecture?', 'What is causal self-attention and why is it important for autoregressive generation?'] },
      { q: 'Why multi-head attention instead of a single attention head?', a: 'A single attention head computes a weighted average that can dilute or miss specific patterns because different relationships may require different weighting schemes. Multiple heads allow the model to attend to different representation subspaces in parallel: one head might focus on syntactic relationships (subject-verb agreement), another on semantic similarity (synonyms), and another on positional proximity (nearby words). Each head has its own learned Q, K, V projections operating in a lower-dimensional space (d_k = d_model/h).', followUps: ['What happens if you set h > d_model / d_k (e.g., more heads than dimensions available)?', 'Do individual attention heads learn interpretable and consistent patterns across different random seeds?'] },
      { q: 'What is causal masking and how does it enable autoregressive generation?', a: 'Causal masking prevents each token from attending to future tokens in the sequence. This is implemented by adding a triangular mask (upper triangle filled with -inf) to the attention scores before softmax, so future positions have e^(-inf) = 0 attention weight. This ensures that during training, the model learns to predict the next token using only previous tokens. During generation, the mask prevents the model from "cheating" by looking at tokens that have not been generated yet.', followUps: ['How does causal masking affect training efficiency compared to bidirectional attention?', 'What is prefix masking and how does it combine bidirectional and causal attention?'] },
    ],
    gotcha: [
      'Attention weights are often misinterpreted as "importance" or "explanation". They only show what the model looked at, not why it looked there or what decision it made based on that information. Attention distributions can be adversarially manipulated without changing model predictions.',
      'The mask in attention must use -inf (or a very large negative value like -1e9) before softmax, not 0. Masking with 0 still assigns e^0 = 1 to the masked position, which contributes to the denominator and dilutes the softmax output. Only -inf produces e^(-inf) = 0, ensuring the masked position has zero contribution.',
      'The scale factor 1/√d_k is theoretically justified for normally distributed Q and K, but in practice learned distributions may have different variance. Some architectures learned to adjust via a learnable temperature parameter instead of the fixed scale.',
    ],
    tradeoffs: [
      { pro: 'Full self-attention provides maximal expressivity — every token directly attends to every other token, enabling the model to learn arbitrary relationships across the entire sequence without attenuation.', con: 'O(n²) compute and memory cost in sequence length makes it impractical for long sequences (100K+ tokens) without algorithmic modifications like sparsity or FlashAttention.' },
      { pro: 'Sparse attention patterns (sliding window, dilated, global+local) reduce complexity to O(n) or O(n log n), enabling processing of very long documents, books, and code repositories.', con: 'Reduced expressivity — tokens cannot directly attend to arbitrary distant positions, information must propagate through intermediate tokens, and efficient hardware implementation of sparse patterns is non-trivial.' },
      { pro: 'Linear attention (kernel-based) replaces the softmax with a kernel feature map, reducing complexity to O(n) while maintaining a reasonable approximation of full attention behavior.', con: 'Quality degradation compared to full attention on tasks requiring precise alignment (translation, entity linking), and the linear kernel may not capture sharp attention distributions as effectively.' },
    ],
  },
};
