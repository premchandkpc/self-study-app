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
      { title: 'What are embeddings in simple terms?', content: 'Word embeddings are numerical representations of words as dense vectors in a continuous space. "Cat" and "dog" have similar vectors because they appear in similar contexts. These vectors capture semantic relationships through vector arithmetic: king - man + woman ≈ queen. Embeddings map discrete tokens (words, subwords, or even images) into a space where similarity reflects meaning.' },
      { title: 'How embeddings work — core mechanics', content: 'An embedding matrix E ∈ ℝ^|V|×d maps each token ID to a dense d-dimensional vector. In Word2Vec (Skip-gram), training predicts surrounding context words from a target word, maximizing log P(context | target). The resulting vectors encode the distributional hypothesis: words in similar contexts have similar meanings. Cosine similarity between vectors measures semantic relatedness. Contextual embeddings (BERT) produce different vectors per context, solving the polysemy problem where one word has multiple meanings.' },
      { title: 'Deep — internals & architecture', content: 'The embedding layer is initialized randomly and trained via backpropagation. Word2Vec uses negative sampling to approximate the full softmax over the vocabulary, making training feasible for vocabularies of millions. GloVe uses matrix factorization of the word co-occurrence count matrix. FastText adds subword information (character n-grams), enabling embeddings for out-of-vocabulary words. Modern LLMs use learned token embeddings (typically 768-12288 dimensions) with learned positional embeddings added to encode position. The embedding matrix dominates model size — GPT-3\'s embedding layer (50257 × 12288) contains ~617M parameters alone.' },
    ],
    why: [
      'Dense embeddings capture semantic relationships that one-hot encoding (bag-of-words) cannot. They reduce dimensionality from |V| (50K+) to 300-768 dimensions, making downstream tasks computationally feasible. Every modern NLP system starts with an embedding layer.',
      'Pretrained embeddings enable transfer learning: embeddings trained on massive corpora (Wikipedia, Common Crawl) capture general semantic knowledge that can be fine-tuned for specific tasks with less data. This is the foundation of modern NLP.',
      'Embeddings extend beyond words — they power recommendation systems (user/item embeddings), graph neural networks (node embeddings), and multimodal AI (image-text joint embeddings like CLIP). The concept of learning vector representations is universal in deep learning.',
    ],
    interview: [
      { q: 'What is the difference between static and contextual embeddings?', a: 'Static embeddings (Word2Vec, GloVe, FastText) assign a single fixed vector to each word regardless of context. "Bank" has the same vector in "river bank" and "money bank", losing polysemy information. Contextual embeddings (BERT, ELMo, GPT) compute different vectors based on the surrounding words — the representation of "bank" changes depending on whether the context is about rivers or finance. BERT uses 12+ layers of bidirectional transformer to compute context-dependent representations, where each token\'s representation is a function of all other tokens in the sentence.', followUps: ['How does BERT handle polysemy differently from static embeddings at a technical level?', 'Why do static embeddings still work well for some tasks like sentiment analysis?'] },
      { q: 'How does Word2Vec Skip-gram training work?', a: 'Given a target word at position t, Skip-gram predicts the surrounding context words within a fixed window (e.g., 5 words on each side). The model has two matrices: an embedding matrix for target words and a separate context matrix. Training maximizes the log probability of each context word given the target word, using noise-contrastive estimation (negative sampling) to avoid computing the expensive full softmax over the vocabulary. The resulting embedding vectors place semantically similar words close together because they share similar distributional contexts across the training corpus.', followUps: ['What is negative sampling and why is it necessary?', 'How does CBOW differ from Skip-gram in terms of training objective and output quality?'] },
      { q: 'What is the distributional hypothesis and how do embeddings exploit it?', a: 'The distributional hypothesis states that words that appear in similar contexts have similar meanings — "you shall know a word by the company it keeps" (Firth, 1957). Word embeddings exploit this by learning vector representations from co-occurrence statistics: if "cat" and "dog" both frequently appear with "pet", "furry", and "walk", their vectors will be close in the embedding space. The Skip-gram objective directly optimizes for this property by making words with shared contexts have similar embedding vectors. This is validated by the fact that embedding arithmetic (king - man + woman ≈ queen) produces meaningful results.', followUps: ['How does the distributional hypothesis fail for rare words?', 'How do contextual embeddings extend the distributional hypothesis?'] },
    ],
    gotcha: [
      'Cosine similarity measures direction, not magnitude. Two vectors pointing in the same direction have cosine similarity near 1 even if one is much longer. For tasks where vector magnitude carries meaning (e.g., word frequency), Euclidean distance or dot product may be more appropriate than cosine similarity.',
      'Word2Vec embeddings can encode and amplify gender, racial, and cultural biases present in training data. For example, "doctor" is more similar to "man" and "nurse" to "woman" in biased corpora. Debiasing techniques (Hard Debias, INLP) are active research areas for ethical AI deployment.',
      'The embedding layer is typically the largest parameter block in transformer models (GPT-3: 617M params out of 175B). This means embedding size significantly impacts model size, memory usage, and inference cost, especially for models with large vocabularies.',
    ],
    tradeoffs: [
      { pro: 'Static embeddings (Word2Vec, GloVe) are fast to train, small in memory (a few hundred MB), and work well for shallow tasks like similarity search, clustering, and simple classifiers.', con: 'No context sensitivity — one vector per word regardless of meaning. This ignores polysemy entirely, so "bank" cannot distinguish between financial and river contexts.' },
      { pro: 'Contextual embeddings (BERT, GPT) produce context-aware representations that capture polysemy and nuanced meaning. They achieve state-of-the-art results on virtually every NLP benchmark.', con: 'Large model sizes (hundreds of MB to GB), slow inference requiring GPU acceleration, and significantly more expensive to train and serve compared to static embeddings.' },
      { pro: 'Subword embeddings (BPE, WordPiece) handle out-of-vocabulary words by composing embeddings from subword units. FastText extends this with character n-grams for even better coverage of rare and morphologically complex words.', con: 'Longer sequences (a word may be split into multiple tokens), increased sequence length means higher attention cost, and subword boundaries can split meaningful morphemes in unintuitive ways.' },
    ],
  },
};
