import { snap } from '@/core/utils/scenarioShared';

function buildTransformerSteps() {
  const steps = [];

  const s = {
    tokens: [],
    layers: [],
    attentionMap: [],
    events: [],
    metrics: { tokens: 0, layers: 0, attnHeads: 0, vocabSize: 0 },
    vars: { phase: '', model: 'GPT-2', params: '124M' },
  };

  snap(steps, s, 'Transformer: encoder-decoder architecture. Core of GPT, BERT, T5.', 1);

  s.metrics.vocabSize = 50257;
  s.vars = { phase: 'Tokenization', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'Input: "The cat sat on the mat"', type: 'info' });
  snap(steps, s, 'TOKENIZATION: Input split into subword tokens using BPE tokenizer.', 1);

  s.tokens = [
    { id: 0, text: 'The', embedding: [0.1, -0.2, 0.3] },
    { id: 1, text: ' cat', embedding: [0.5, 0.1, -0.4] },
    { id: 2, text: ' sat', embedding: [-0.3, 0.7, 0.2] },
    { id: 3, text: ' on', embedding: [0.2, -0.1, 0.6] },
    { id: 4, text: ' the', embedding: [0.4, 0.3, -0.2] },
    { id: 5, text: ' mat', embedding: [0.8, -0.5, 0.1] },
  ];
  s.metrics.tokens = 6;
  s.vars = { phase: 'Embedding + Positional Encoding', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'Tokens embedded into 768-dim vectors. Positional encodings added.', type: 'info' });
  snap(steps, s, 'EMBEDDING: Each token → 768-dim vector. Positional encoding added for order.', 2);

  s.layers = [{ name: 'Multi-Head Attention', active: true }];
  s.attentionMap = [
    [0.9, 0.1, 0.0, 0.0, 0.0, 0.0],
    [0.2, 0.8, 0.0, 0.0, 0.0, 0.0],
    [0.1, 0.1, 0.7, 0.1, 0.0, 0.0],
    [0.0, 0.1, 0.3, 0.5, 0.1, 0.0],
    [0.0, 0.0, 0.1, 0.2, 0.6, 0.1],
    [0.0, 0.0, 0.0, 0.1, 0.2, 0.7],
  ];
  s.metrics.attnHeads = 12;
  s.vars = { phase: 'Multi-Head Attention', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: '12 attention heads each attend to different positions', type: 'info' });
  snap(steps, s, 'MULTI-HEAD ATTENTION: 12 heads compute attention in parallel. Each head captures different patterns.', 3);

  s.layers = [
    { name: 'Multi-Head Attention', active: false },
    { name: 'Add & LayerNorm', active: true },
  ];
  s.vars = { phase: 'Add & Normalize', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'Residual connection: input + attention output. LayerNorm applied.', type: 'info' });
  snap(steps, s, 'ADD & NORM: Residual (skip) connection prevents gradient vanishing. LayerNorm stabilizes training.', 4);

  s.layers = [
    { name: 'Multi-Head Attention', active: false },
    { name: 'Add & LayerNorm', active: false },
    { name: 'Feed-Forward Network', active: true },
  ];
  s.vars = { phase: 'Feed-Forward Network (FFN)', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'FFN: 768 → 3072 → 768. ReLU activation.', type: 'info' });
  snap(steps, s, 'FFN: Two linear layers with ReLU. Expands to 3072 then projects back to 768. Adds non-linearity.', 5);

  s.layers = [
    { name: 'Multi-Head Attention', active: false },
    { name: 'Add & LayerNorm', active: false },
    { name: 'Feed-Forward Network', active: false },
    { name: 'Add & LayerNorm (2)', active: true },
  ];
  s.vars = { phase: 'Add & Norm (2)', model: 'GPT-2', params: '124M' };
  snap(steps, s, 'Second residual + layer norm. This completes one transformer block. GPT-2 has 12 blocks.', 6);

  s.layers = [
    { name: 'Multi-Head Attention', active: true },
    { name: 'Add & LayerNorm', active: true },
    { name: 'Feed-Forward Network', active: true },
    { name: 'Add & LayerNorm (2)', active: true },
    { name: 'Layer 12 / 12', active: true },
  ];
  s.metrics.layers = 12;
  s.vars = { phase: 'All 12 layers complete', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'Output through all 12 decoder blocks', type: 'ok' });
  snap(steps, s, 'All 12 transformer blocks complete. Each block: Attn → AddNorm → FFN → AddNorm.', 7);

  s.vars = { phase: 'Softmax → Output', model: 'GPT-2', params: '124M' };
  s.events.push({ msg: 'Final layer norm + linear head + softmax over vocab', type: 'info' });
  s.events.push({ msg: 'Next token: "s" (probability 0.32)', type: 'ok' });
  snap(steps, s, 'SOFTMAX: Final embedding projected to vocab (50257). Softmax gives next-token probabilities. "s" most likely next char.', 8);

  return steps;
}

export const TRANSFORMER_CODE = [
  'class TransformerBlock(nn.Module):',
  '    def __init__(self, d_model=768, n_heads=12):',
  '        super().__init__()',
  '        self.attn = MultiHeadAttention(d_model, n_heads)',
  '        self.norm1 = nn.LayerNorm(d_model)',
  '        self.ffn = nn.Sequential(',
  '            nn.Linear(d_model, d_model * 4),  # 768 → 3072',
  '            nn.ReLU(),',
  '            nn.Linear(d_model * 4, d_model),  # 3072 → 768',
  '        )',
  '        self.norm2 = nn.LayerNorm(d_model)',
  '',
  '    def forward(self, x):',
  '        # Multi-head attention + residual',
  '        x = x + self.attn(self.norm1(x))',
  '        # FFN + residual',
  '        x = x + self.ffn(self.norm2(x))',
  '        return x',
];

export default {
  id: 'transformer',
  label: 'Transformer',
  icon: '\U0001f916',
  build: buildTransformerSteps,
  code: TRANSFORMER_CODE,
  language: 'python',
  metrics: [
    { key: 'tokens', label: 'Tokens', max: 20, color: 'var(--node-active)' },
    { key: 'layers', label: 'Layers', max: 16, color: 'var(--pod-running)' },
    { key: 'attnHeads', label: 'Attention Heads', max: 16, color: 'var(--kafka-producer)' },
    { key: 'vocabSize', label: 'Vocab (K)', max: 100, color: 'var(--node-comparing)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'A transformer is like a group of students reading a book together. Each student (token) reads their sentence, but they also whisper to each other about what they read (attention). Then they discuss in small groups (multi-head attention), take notes (FFN), and pass their notes forward (residual connections). The next student builds on everything said before.' },
      { title: 'Core — How it works', content: 'The transformer uses stacked blocks of multi-head self-attention and feed-forward networks with residual connections and layer norm. Each token attends to all others via scaled dot-product attention: Q·K^T/√d_k → softmax weights → weighted sum of V. Multi-head (e.g., 12 heads) captures different relational patterns in parallel.' },
    ],
    why: ['Transformers revolutionized NLP because they process all tokens in parallel (unlike RNNs) and capture long-range dependencies via attention. They scale to billions of parameters and power GPT, BERT, T5, and LLMs.'],
    interview: [
      { question: 'Why does the transformer use scaled dot-product attention instead of regular dot-product?', answer: 'Scaling by 1/√d_k prevents the dot products from growing large when d_k is high. Large values push softmax into regions of extremely small gradients, killing learning. The scale factor keeps the variance of the dot products near 1, preserving gradient flow.', followUps: ['What happens if you omit the scale?', 'Is there an alternative normalization?'] },
      { question: 'What is the role of positional encoding in transformers?', answer: 'Self-attention is permutation-invariant — it has no notion of token order. Positional encodings (sinusoidal or learned) are added to input embeddings to encode position. Sinusoidal encodings use alternating sine/cosine of different frequencies, allowing the model to learn relative positions without training.', followUps: ['Why sinusoidal vs learned?', 'How does RoPE (Rotary Position Embedding) differ?'] },
    ],
    gotcha: ['Quadratic complexity: self-attention is O(n²) in sequence length due to the n×n attention matrix. For long sequences (e.g., 100K tokens), this becomes prohibitive. FlashAttention and sparse attention mitigate this.', 'The decoder uses masked self-attention (causal mask) to prevent attending to future tokens. The encoder uses bidirectional (full) self-attention. Confusing these is a common architecture error.'],
    tradeoffs: [
      { pro: 'Parallel processing — faster training than RNNs', con: 'O(n²) memory in sequence length' },
      { pro: 'Long-range dependencies — attention connects any pair', con: 'no inherent locality bias, needs more data to learn structure' },
    ],
  },
};
