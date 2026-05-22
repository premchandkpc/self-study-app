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
  icon: 'U0001f916',
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
      { title: 'What is a transformer in simple terms?', content: 'A transformer is a neural network architecture that processes sequences all at once instead of one step at a time. Each token in the input can directly "look at" every other token using a mechanism called self-attention. This is like a group conversation where everyone hears everything simultaneously, rather than a game of telephone where information degrades across steps. Transformers power GPT, BERT, and all modern LLMs.' },
      { title: 'How transformers work — core mechanics', content: 'The transformer stacks identical blocks of multi-head self-attention and feed-forward networks, each wrapped with residual connections and layer normalization. Self-attention computes Query, Key, and Value projections for each token, then calculates attention scores via scaled dot-product (Q·K^T / √d_k), applies softmax, and takes a weighted sum of Values. Multi-head attention (e.g., 12 heads) projects into lower-dimensional subspaces in parallel, capturing different relational patterns.' },
      { title: 'Deep — internals & architecture', content: 'The transformer has an encoder (bidirectional self-attention) and a decoder (masked self-attention + cross-attention). Each head learns distinct attention patterns: one head may attend to syntax, another to semantic relationships. The FFN expands dimensionality by 4x (e.g., 768→3072) with ReLU activation, adding non-linear transformations per position. Residual connections with pre/post layer norm stabilize training at depth. GPT-3 uses 96 layers, 96 heads, and 12288-dim embeddings across 175 billion parameters.' },
    ],
    why: [
      'Transformers revolutionized NLP because they process all tokens in parallel, unlike RNNs which process sequentially. This enables training on much larger datasets with GPUs, capturing long-range dependencies that RNNs forget. Every major language model (GPT, Claude, Gemini, Llama) is based on the transformer architecture.',
      'The transformer architecture scales to hundreds of billions of parameters because the core computation (matrix multiplications in attention and FFN) maps efficiently to GPU hardware. This scalability is the fundamental reason for the modern LLM era.',
      'Transformers are not limited to text — they power Vision Transformer (ViT) for images, Codex for code generation, Whisper for speech, and multimodal models like GPT-4V. The architecture is universal across data modalities.',
    ],
    interview: [
      { q: 'Why does the transformer use scaled dot-product attention instead of regular dot-product?', a: 'Scaling by 1/√d_k prevents the dot products from growing large when d_k is high. Large dot product values push the softmax function into regions of extremely small gradients (near 0 or 1), which kills gradient flow during backpropagation. The scale factor keeps the variance of the dot products near 1, preserving gradients. Without scaling, training becomes unstable or fails entirely, especially for deeper models with larger d_k.', followUps: ['What happens empirically if you omit the scale factor?', 'Is there an alternative normalization like L2 normalization of Q and K?'] },
      { q: 'What is the role of positional encoding in transformers?', a: 'Self-attention is permutation-invariant — it has no inherent notion of token order. Positional encodings are added to input embeddings to inject position information. Sinusoidal encodings use alternating sine and cosine functions at different frequencies, allowing the model to learn relative positions without training. Learned positional embeddings are trainable parameters. Modern approaches like RoPE (Rotary Position Embedding) rotate Q and K vectors by position-dependent angles, encoding relative positions more naturally in the attention computation itself.', followUps: ['Why might sinusoidal encodings generalize better than learned ones?', 'How does RoPE differ from absolute positional encoding?'] },
      { q: 'What is the difference between encoder-only, decoder-only, and encoder-decoder transformers?', a: 'Encoder-only models (BERT) use bidirectional self-attention where every token can attend to every other token — best for understanding tasks like classification and NER. Decoder-only models (GPT) use causal (masked) self-attention where each token can only attend to previous tokens — best for generation tasks. Encoder-decoder models (T5) use an encoder with bidirectional attention and a decoder with cross-attention over encoder outputs — best for sequence-to-sequence tasks like translation and summarization.', followUps: ['Why do most modern LLMs use decoder-only architecture?', 'What is the prefix LM architecture and how does it combine both?'] },
    ],
    gotcha: [
      'Quadratic complexity: self-attention is O(n²) in both compute and memory due to the n×n attention matrix. For 100K-token sequences, even storing the attention matrix is infeasible. FlashAttention and sparse attention patterns mitigate this.',
      'The decoder uses masked self-attention (causal mask) to prevent attending to future tokens. The encoder uses bidirectional (full) self-attention. Confusing these in architecture design is a common error that leads to information leakage from future tokens.',
      'Transformers have no inherent locality bias — unlike CNNs which assume nearby pixels are related. This means they need more data and larger models to learn local patterns that CNNs capture with far fewer parameters.',
      'Inference with transformers requires KV-cache for efficiency — storing past Key and Value vectors to avoid recomputation. As sequence length grows, the KV-cache size dominates GPU memory, making long-context inference a memory-bound problem.',
    ],
    tradeoffs: [
      { pro: 'Parallel processing across all tokens enables efficient GPU utilization and much faster training compared to sequential RNNs. The architecture scales to billions of parameters without fundamental redesign.', con: 'O(n²) compute and memory cost in sequence length makes long-context processing expensive. 100K-token sequences require algorithmic tricks like sparse attention or FlashAttention to be practical.' },
      { pro: 'Self-attention captures long-range dependencies between any pair of positions, enabling the model to learn relationships across thousands of tokens without the vanishing gradient problem of RNNs.', con: 'No inherent locality or positional bias means the model must learn these patterns from data, requiring more parameters and training data to match CNNs on tasks where locality is beneficial.' },
      { pro: 'Residual connections with layer normalization enable training of very deep models (100+ layers) by preventing gradient vanishing and stabilizing activations across the depth of the network.', con: 'Layer norm adds computational overhead and the residual stream requires higher precision (FP32/FP16) compared to alternatives, increasing memory footprint during both training and inference.' },
    ],
  },
};
