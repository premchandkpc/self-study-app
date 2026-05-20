import { snap } from '@/core/utils/scenarioShared';

function buildEmbeddingsSteps() {
  const steps = [];

  const s = {
    words: [],
    vocab: {},
    events: [],
    metrics: { vocabSize: 0, embedDim: 0, wordsLearned: 0, similarPairs: 0 },
    vars: { method: '', corpus: 'Wikipedia', dim: 300 },
  };

  snap(steps, s, 'Word Embeddings: convert discrete tokens to dense vectors. Semantic meaning in vector space.', 1);

  s.vocab = { the: 0, cat: 1, sat: 2, on: 3, mat: 4, dog: 5, ran: 6 };
  s.metrics.vocabSize = 7;
  s.metrics.embedDim = 300;
  s.vars = { method: 'One-hot encoding', corpus: 'Wikipedia', dim: 300 };
  snap(steps, s, 'ONE-HOT: Each word = sparse vector of |V|. "cat" = [0,1,0,0,0,0,0]. Impractical for large vocab.', 1);

  s.words = [
    { text: 'cat', vector: [0.2, 0.8, -0.1, 0.5], neighbors: ['dog', 'kitten', 'pet'] },
    { text: 'dog', vector: [0.3, 0.7, -0.2, 0.4], neighbors: ['cat', 'puppy', 'pet'] },
    { text: 'sat', vector: [0.9, 0.1, 0.3, 0.2], neighbors: ['ran', 'walked', 'stood'] },
    { text: 'ran', vector: [0.8, 0.2, 0.4, 0.1], neighbors: ['sat', 'walked', 'jumped'] },
  ];
  s.vars = { method: 'Embedding matrix lookup (300d)', corpus: 'Wikipedia', dim: 300 };
  s.events.push({ msg: 'Embedding matrix E ∈ ℝ^|V|×300 projects one-hot to dense 300-dim', type: 'info' });
  snap(steps, s, 'EMBEDDING LOOKUP: One-hot × embedding matrix → dense 300-dim vector. "cat" = E[1].', 2);

  s.words = s.words.map((w) => ({
    ...w,
    neighbors: w.text === 'cat' ? ['dog', 'kitten', 'pet'] :
               w.text === 'dog' ? ['cat', 'puppy', 'pet'] :
               w.text === 'sat' ? ['ran', 'walked', 'stood'] :
               ['sat', 'walked', 'jumped'],
    vector: w.vector,
  }));
  s.metrics.similarPairs = 2;
  s.vars = { method: 'Semantic similarity (cosine)', corpus: 'Wikipedia', dim: 300 };
  s.events.push({ msg: 'cosine(cat, dog) = 0.89 → high similarity', type: 'ok' });
  s.events.push({ msg: 'cosine(cat, ran) = 0.12 → low similarity', type: 'info' });
  snap(steps, s, 'COSINE SIMILARITY: cat≈dog (cosine 0.89). Semantic relationships captured: pets vs actions.', 3);

  s.words.push(
    { text: 'king', vector: [0.9, 0.3, 0.8, 0.2], neighbors: ['queen', 'prince', 'royal'] },
    { text: 'queen', vector: [0.85, 0.4, 0.7, 0.1], neighbors: ['king', 'princess', 'royal'] },
    { text: 'man', vector: [0.6, 0.8, 0.4, 0.5], neighbors: ['woman', 'boy', 'person'] },
    { text: 'woman', vector: [0.7, 0.9, 0.3, 0.6], neighbors: ['man', 'girl', 'person'] },
  );
  s.metrics.vocabSize = 11;
  s.vars = { method: 'Analogies (word2vec)', corpus: 'Wikipedia', dim: 300 };
  s.events.push({ msg: 'king - man + woman ≈ queen (vector arithmetic!)', type: 'ok' });
  snap(steps, s, 'WORD ANALOGIES: king - man + woman ≈ queen. Vector arithmetic encodes relationships.', 4);

  s.vars = { method: 'word2vec (CBOW/Skip-gram)', corpus: 'Wikipedia', dim: 300 };
  s.events.push({ msg: 'CBOW: predict word from context. Skip-gram: predict context from word.', type: 'info' });
  snap(steps, s, 'WORD2VEC: CBOW predicts target from surrounding words. Skip-gram predicts neighbors from target. Trained on billions of words.', 5);

  s.vars = { method: 'Contextual embeddings (BERT)', corpus: 'Wikipedia + Books', dim: 768 };
  s.events.push({ msg: 'BERT: "bank" → different vector for "river bank" vs "money bank"', type: 'ok' });
  s.events.push({ msg: 'Static: word2vec has ONE vector per word. Contextual: different per context.', type: 'info' });
  snap(steps, s, 'CONTEXTUAL EMBEDDINGS (BERT): Same word → different vector based on context. Polysemy solved. "bank" ≠ "river bank" vs "money bank".', 6);

  return steps;
}

export const EMBEDDINGS_CODE = [
  'import torch.nn as nn',
  '',
  'class Embedding(nn.Module):',
  '    def __init__(self, vocab_size=50000, d_model=300):',
  '        super().__init__()',
  '        # Embedding matrix: |V| × d_model',
  '        self.embed = nn.Embedding(vocab_size, d_model)',
  '',
  '    def forward(self, x):',
  '        # x: token IDs [batch, seq_len]',
  '        # returns: [batch, seq_len, d_model]',
  '        return self.embed(x)',
  '',
  '# Word2Vec: CBOW / Skip-gram (shallow, fast)',
  '# BERT/GPT: contextual (deep, contextualized)',
  '# Pretrained: GloVe (300d), FastText, BERT (768d)',
];

export default {
  id: 'embeddings',
  label: 'Embeddings',
  icon: '\U0001f522',
  build: buildEmbeddingsSteps,
  code: EMBEDDINGS_CODE,
  language: 'python',
  metrics: [
    { key: 'vocabSize', label: 'Vocab Size', max: 20, color: 'var(--node-active)' },
    { key: 'embedDim', label: 'Embed Dim', max: 1000, color: 'var(--pod-running)' },
    { key: 'similarPairs', label: 'Similar Pairs', max: 10, color: 'var(--kafka-producer)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Kid-friendly analogy', content: 'Word embeddings are like a map of words. "Cat" and "dog" are close together on the map (similar meaning). "Cat" and "ran" are far apart (different meaning). The map also has directions: king → man + woman ≈ queen. You can navigate the map using vector arithmetic to find relationships.' },
      { title: 'Core — How it works', content: 'Word embeddings project discrete tokens into dense vector space (e.g., 300-dim). The embedding matrix E ∈ ℝ^|V|×d is learned such that semantically similar words have similar vectors (high cosine similarity). Word2Vec (CBOW/Skip-gram) learns via predicting context. Contextual embeddings (BERT) learn per-context vectors, solving polysemy.' },
    ],
    why: ['Dense embeddings capture semantic relationships that one-hot encoding cannot. They reduce dimensionality (|V| → 300), enable transfer learning (pretrained embeddings), and are the foundation of modern NLP systems.'],
    interview: [
      { question: 'What is the difference between static and contextual embeddings?', answer: 'Static embeddings (Word2Vec, GloVe, FastText): each word has ONE vector regardless of context. "Bank" is the same for "river bank" and "money bank". Contextual embeddings (BERT, ELMo): produce different vectors based on surrounding words. BERT uses 12+ layers of transformer to compute context-dependent representations.', followUps: ['How does BERT handle polysemy?', 'Why does static word2vec still work well for some tasks?'] },
      { question: 'How does Word2Vec Skip-gram work?', answer: 'Given a target word, predict its surrounding context words within a window. The model has an embedding matrix and a separate context matrix. Training maximizes log P(context | target). The resulting embedding vectors place similar words close together because they share similar contexts (distributional hypothesis).', followUps: ['What is negative sampling?', 'How does CBOW differ from Skip-gram?'] },
    ],
    gotcha: ['Cosine similarity measures direction, not magnitude. Two vectors pointing the same way are "similar" even if one is much longer. For magnitude-sensitive tasks, Euclidean distance may be more appropriate.', 'Word2Vec embeddings can encode gender/racial biases from training data (e.g., "doctor—man" proximity). This is a major ethical concern — debiasing techniques (Hard Debias, INLP) are active research.'],
    tradeoffs: [
      { pro: 'Static embeddings — fast, small, good for shallow tasks', con: 'no context sensitivity, one vector per word, ignores polysemy' },
      { pro: 'Contextual embeddings — context-aware, SOTA on most NLP tasks', con: 'large models (hundreds of MB), slow inference, need GPU' },
    ],
  },
};
