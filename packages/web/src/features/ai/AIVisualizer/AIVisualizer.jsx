import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './ai-engine';
import ScenarioToolbar from '../../../components/shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../../components/shared/StepControls/StepControls';
import ComplexityPanel from '../../../components/shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import MetricsPanel from '../../../components/shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../../components/shared/VariablesPanel/VariablesPanel';
import TopicContentSection from '../../../components/shared/TopicContentSection/TopicContentSection';
import styles from './AIVisualizer.module.css';

export default function AIVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.vizArea}>
        <div className={styles.mainViz}>
          {activeId === 'transformer' && <TransformerView viz={viz} />}
          {activeId === 'attention' && <AttentionView viz={viz} />}
          {activeId === 'embeddings' && <EmbeddingsView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>AI Events</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />{ev.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viz.narration && (
        <div className={styles.narration}>{viz.narration}</div>
      )}

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />

      <TopicContentSection topicContent={active.topicContent} />
    </div>
  );
}

/* === TRANSFORMER VIEW === */
function TransformerView({ viz }) {
  const { tokens, layers, attentionMap } = viz;

  return (
    <div className={styles.transformerLayout}>
      <div className={styles.tokensRow}>
        {tokens?.map((t) => (
          <div key={t.id} className={styles.tokenBox}>
            <span className={styles.tokenText}>{t.text}</span>
            <div className={styles.tokenEmbedding}>
              {t.embedding?.slice(0, 3).map((v, i) => (
                <span key={i} className={styles.embedVal}>{v.toFixed(1)}</span>
              ))}
              <span className={styles.embedEllipsis}>...</span>
            </div>
          </div>
        ))}
        {(!tokens || tokens.length === 0) && (
          <div className={styles.emptyState}>Tokens appear during tokenization step.</div>
        )}
      </div>

      <div className={styles.layersRow}>
        {layers?.map((l, i) => (
          <div
            key={i}
            className={`${styles.layerBox} ${l.active ? styles.layerActive : ''}`}
          >
            {l.name}
          </div>
        ))}
        {(!layers || layers.length === 0) && (
          <div className={styles.emptyState}>Layers appear during execution.</div>
        )}
      </div>

      {attentionMap?.length > 0 && (
        <div className={styles.attnGridSection}>
          <div className={styles.sectionLabel}>Attention Map</div>
          <div className={styles.attnGrid}>
            {attentionMap.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`${r}-${c}`}
                  className={styles.attnCell}
                  style={{
                    backgroundColor: `rgba(34, 197, 94, ${val})`,
                    opacity: 0.4 + val * 0.6,
                  }}
                >
                  <span className={styles.attnVal}>{val.toFixed(1)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* === ATTENTION VIEW === */
function AttentionView({ viz }) {
  const { tokens, scores, attentionWeights } = viz;

  return (
    <div className={styles.attentionLayout}>
      <div className={styles.attentionTokens}>
        {tokens?.map((t) => (
          <div key={t.id} className={styles.attnTokenBox}>
            <span className={styles.attnTokenText}>{t.text}</span>
            <div className={styles.attnTokenId}>#{t.id}</div>
          </div>
        ))}
      </div>

      <div className={styles.matrixRow}>
        {scores?.length > 0 && (
          <div className={styles.matrixSection}>
            <div className={styles.sectionLabel}>Scores (Q·K^T)</div>
            <div className={styles.heatGrid}>
              {scores.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`s-${r}-${c}`}
                    className={styles.heatCell}
                    style={{
                      backgroundColor: `rgba(234, 179, 8, ${Math.min(val / 1.5, 1)})`,
                      opacity: 0.3 + Math.min(val / 1.5, 1) * 0.7,
                    }}
                  >
                    {val.toFixed(1)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {attentionWeights?.length > 0 && (
          <div className={styles.matrixSection}>
            <div className={styles.sectionLabel}>Attention Weights (Softmax)</div>
            <div className={styles.heatGrid}>
              {attentionWeights.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`w-${r}-${c}`}
                    className={styles.heatCell}
                    style={{
                      backgroundColor: `rgba(34, 197, 94, ${val})`,
                      opacity: 0.3 + val * 0.7,
                    }}
                  >
                    {val.toFixed(2)}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* === EMBEDDINGS VIEW === */
function EmbeddingsView({ viz }) {
  const { words } = viz;

  return (
    <div className={styles.embedLayout}>
      <div className={styles.embedGrid}>
        {words?.map((w, i) => (
          <div key={i} className={styles.wordCard}>
            <div className={styles.wordText}>{w.text}</div>
            <div className={styles.wordVector}>
              <span className={styles.vectorLabel}>[</span>
              {w.vector?.map((v, j) => (
                <span
                  key={j}
                  className={styles.vectorVal}
                  style={{
                    color: v >= 0 ? 'var(--pod-running)' : 'var(--pod-crash)',
                  }}
                >
                  {v.toFixed(1)}
                  {j < w.vector.length - 1 ? ', ' : ''}
                </span>
              ))}
              <span className={styles.vectorLabel}>]</span>
            </div>
            {w.neighbors?.length > 0 && (
              <div className={styles.neighborRow}>
                <span className={styles.neighborLabel}>∼ </span>
                {w.neighbors.map((n, j) => (
                  <span key={j} className={styles.neighborWord}>{n}{j < w.neighbors.length - 1 ? ', ' : ''}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {(!words || words.length === 0) && (
          <div className={styles.emptyState}>Words appear during embedding lookup.</div>
        )}
      </div>
    </div>
  );
}
