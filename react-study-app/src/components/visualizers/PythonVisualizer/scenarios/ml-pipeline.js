import { snap } from '@/core/utils/scenarioShared';

function buildMLPipelineSteps() {
  const steps = [];

  const s = {
    stage: 'initialization',
    data: { raw: 10000, cleaned: 0, split: { train: 0, test: 0, val: 0 }, transformed: 0 },
    model: { name: 'RandomForest', trained: false, accuracy: 0, loss: 0 },
    pipeline: [],
    metrics: { dataSize: 10000, trainingTime: 0, accuracy: 0, f1Score: 0, latency: 0 },
    events: [],
    vars: { stage: 'data-loading', completed: 0, total: 6 },
  };

  snap(steps, s, 'ML Pipeline: End-to-end machine learning workflow. Input: 10,000 raw samples. Goal: Train classifier, evaluate, deploy.', 1, 'Pipeline init');

  // === STAGE 1: DATA LOADING ===
  s.stage = 'data-loading';
  s.events.push({ type: 'info', msg: 'Loading dataset from CSV' });
  s.pipeline.push({ name: 'Load Data', status: 'active', rows: 10000, features: 0 });
  s.data.raw = 10000;
  s.metrics.dataSize = 10000;
  s.vars = { stage: 'data-loading', completed: 1, total: 6 };
  snap(steps, s, 'Stage 1 — Data Loading: Read 10,000 samples from CSV. Loaded 250 MB into memory. Initial features: [age, income, credit_score, loan_amount, ...].', 2, 'O(n) load');

  // === STAGE 2: DATA CLEANING ===
  s.stage = 'data-cleaning';
  s.pipeline[0].status = 'completed';
  s.pipeline.push({ name: 'Clean Data', status: 'active', rows: 10000, features: 15 });
  s.events.push({ type: 'info', msg: 'Handling missing values and outliers' });
  snap(steps, s, 'Stage 2 — Data Cleaning: Drop 150 rows with missing values (NULL). Remove 50 outliers (3-sigma rule). Remaining: 9,800 samples.', 3, 'O(n) clean');

  s.data.cleaned = 9800;
  snap(steps, s, 'Cleaning complete! Validated 15 features. No NaN values remain. Data quality check: PASSED.', 4, 'Data QC');

  // === STAGE 3: FEATURE ENGINEERING ===
  s.stage = 'feature-engineering';
  s.pipeline[1].status = 'completed';
  s.pipeline.push({ name: 'Feature Engineering', status: 'active', rows: 9800, features: 42 });
  s.events.push({ type: 'info', msg: 'Creating derived features and scaling' });
  snap(steps, s, 'Stage 3 — Feature Engineering: Create 27 derived features (age_sq, income_ratio, debt_to_income, etc.). Apply StandardScaler (mean=0, std=1). Features: 15 → 42.', 5, 'O(n*d) engineer');

  s.data.transformed = 9800;
  snap(steps, s, 'Feature engineering complete! 42 features ready for training. Data shape: (9800, 42). Distribution: normalized.', 6, 'Features ready');

  // === STAGE 4: TRAIN-TEST SPLIT ===
  s.stage = 'train-test-split';
  s.pipeline[2].status = 'completed';
  s.pipeline.push({ name: 'Train-Test Split', status: 'active', rows: 9800, split: { train: 7840, val: 980, test: 980 } });
  s.events.push({ type: 'info', msg: '80% train, 10% val, 10% test split' });
  snap(steps, s, 'Stage 4 — Train-Test Split: Stratified split on target class. Train: 7,840 (80%), Val: 980 (10%), Test: 980 (10%). Random seed: 42 (reproducible).', 7, 'O(n) split');

  s.data.split = { train: 7840, test: 980, val: 980 };
  snap(steps, s, 'Split complete! Training set ready. Both val and test sets stratified. Class balance: Train ≈ Val ≈ Test.', 8, 'Data split');

  // === STAGE 5: MODEL TRAINING ===
  s.stage = 'training';
  s.pipeline[3].status = 'completed';
  s.pipeline.push({ name: 'Train Model', status: 'active', name: 'RandomForest', trees: 100, depth: 20 });
  s.model.name = 'RandomForest(n_estimators=100, max_depth=20)';
  s.events.push({ type: 'info', msg: 'Training RandomForest with 100 decision trees' });
  snap(steps, s, 'Stage 5 — Model Training: Train RandomForest classifier. 100 trees, max depth 20. Training on (7840, 42) data. Progress: 25% → 50% → 75% → 100%.', 9, 'O(n*d*log n) train');

  s.metrics.trainingTime = 4500;
  s.model.trained = true;
  snap(steps, s, 'Training complete! Time: 4.5 seconds. Trees built. Feature importance computed. Top features: credit_score=0.32, income=0.24, debt_to_income=0.18.', 10, 'Training done');

  // === STAGE 6: MODEL EVALUATION ===
  s.stage = 'evaluation';
  s.pipeline[4].status = 'completed';
  s.pipeline.push({ name: 'Evaluate Model', status: 'active', metrics: ['Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC'] });
  s.events.push({ type: 'info', msg: 'Evaluating on validation set' });
  snap(steps, s, 'Stage 6 — Model Evaluation: Predict on validation set (980 samples). Compute metrics.', 11, 'O(n*m) eval');

  s.model.accuracy = 0.92;
  s.metrics.accuracy = 92;
  s.metrics.f1Score = 0.89;
  snap(steps, s, 'Validation Results: Accuracy = 92%. Precision = 0.91, Recall = 0.88, F1 = 0.89, ROC-AUC = 0.94. Hyperparameter tuning can improve.', 12, 'Validation');

  // === STAGE 7: TEST EVALUATION ===
  s.stage = 'test-evaluation';
  s.events.push({ type: 'success', msg: 'Evaluating on held-out test set' });
  snap(steps, s, 'Final evaluation on test set (980 samples). Results generalize well: Accuracy = 91%, F1 = 0.88. No overfitting detected!', 13, 'Test eval');

  s.pipeline[5] = { name: 'Deploy Model', status: 'completed', latency: 150 };
  s.metrics.latency = 150;
  s.events.push({ type: 'success', msg: 'Model ready for production' });
  snap(steps, s, 'Pipeline Complete! Model saved as loan_classifier_v1.pkl. Inference latency: 150ms per prediction. Ready to deploy!', 14, 'Deployment ready');

  // === MONITORING / INFERENCE ===
  s.stage = 'inference';
  s.pipeline.push({ name: 'Inference', status: 'active', qps: 100, latency: 150, accuracy: 91 });
  s.events.push({ type: 'info', msg: 'Model serving 100 QPS in production' });
  snap(steps, s, 'Production: Model serving at 100 requests/sec. P99 latency: 250ms. Accuracy: 91% (stable). Monitor for data drift every hour.', 15, 'Serving');

  // === SUMMARY ===
  s.vars = { stage: 'complete', completed: 6, total: 6 };
  snap(steps, s, 'ML Pipeline Summary: Data (9,800) → Features (42) → Train (7,840) → Model → Test (980). Final accuracy: 91%. Latency: 150ms. Pipeline duration: 5.2 seconds.', 16, 'Summary');

  return steps;
}

export const ML_PIPELINE_CODE = [
  '# ML Pipeline with sklearn',
  'from sklearn.pipeline import Pipeline',
  'from sklearn.preprocessing import StandardScaler',
  'from sklearn.ensemble import RandomForestClassifier',
  'from sklearn.model_selection import train_test_split',
  'import pandas as pd',
  '',
  '# Step 1: Load & Clean',
  'df = pd.read_csv("loans.csv")',
  'df = df.dropna()  # Remove nulls',
  'df = df[df["age"].between(18, 80)]  # Remove outliers',
  '',
  '# Step 2: Features',
  'X = df[["age", "income", "credit_score", "loan_amount"]]',
  'y = df["approved"]',
  '',
  '# Step 3: Split (80-10-10)',
  'X_train, X_test, y_train, y_test = train_test_split(',
  '    X, y, test_size=0.2, random_state=42, stratify=y',
  ')',
  '',
  '# Step 4: Pipeline (scale + train)',
  'pipeline = Pipeline([',
  '    ("scaler", StandardScaler()),',
  '    ("clf", RandomForestClassifier(n_estimators=100))',
  '])',
  '',
  '# Step 5: Train',
  'pipeline.fit(X_train, y_train)',
  '',
  '# Step 6: Evaluate',
  'accuracy = pipeline.score(X_test, y_test)',
  'print(f"Accuracy: {accuracy:.2%}")',
  '',
  '# Step 7: Predict',
  'pred = pipeline.predict([[35, 50000, 750, 25000]])',
];

export default {
  id: 'ml-pipeline',
  label: 'ML Pipelines',
  icon: '🔗',
  build: buildMLPipelineSteps,
  code: ML_PIPELINE_CODE,
  language: 'python',
  metrics: [
    { key: 'dataSize', label: 'Data Samples', max: 10000, color: 'var(--node-active)' },
    { key: 'trainingTime', label: 'Training Time (ms)', max: 5000, color: 'var(--node-comparing)' },
    { key: 'accuracy', label: 'Accuracy (%)', max: 100, color: 'var(--node-success)', warn: 80, critical: 70 },
    { key: 'f1Score', label: 'F1 Score', max: 1, color: 'var(--kafka-producer)' },
    { key: 'latency', label: 'Inference Latency (ms)', max: 500, color: 'var(--node-comparing)' },
  ],
};
