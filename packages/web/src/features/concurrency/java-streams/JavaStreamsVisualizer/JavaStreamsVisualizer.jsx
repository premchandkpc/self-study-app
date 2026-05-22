import { useState } from 'react';
import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { STREAM_SCENARIOS, STREAM_CATEGORIES } from './java-streams-engine';
import StepControls from '../../../components/shared/StepControls/StepControls';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import NarrationPanel from '../../../components/shared/NarrationPanel/NarrationPanel';
import styles from './JavaStreamsVisualizer.module.css';

const STATE_COLORS = {
  idle: 'var(--bg-tertiary)',
  active: 'var(--node-comparing)',
  passed: 'var(--node-default)',
  filtered: 'var(--pod-crash)',
  transformed: 'var(--node-path)',
  collected: 'var(--pod-running)',
  new: 'var(--accent-blue)',
  skipped: 'var(--text-muted)',
  matched: 'var(--node-default)',
  error: 'var(--pod-crash)',
};

const TYPE_COLORS = {
  source: 'var(--accent-blue)',
  intermediate: 'var(--node-comparing)',
  terminal: 'var(--pod-running)',
};

function OpBadge({ type }) {
  return (
    <span className={styles.opBadge} style={{ background: TYPE_COLORS[type] || 'var(--text-muted)' }}>
      {type}
    </span>
  );
}

function StageCard({ stage, isActive }) {
  return (
    <div className={`${styles.stageCard} ${isActive ? styles.stageCardActive : ''}`}>
      <div className={styles.stageHeader}>
        <span className={styles.stageOp}>{stage.op}</span>
        <OpBadge type={stage.type} />
      </div>
      <div className={styles.elementsRow}>
        {stage.elements.length === 0 && (
          <span className={styles.emptyElements}>∅</span>
        )}
        {stage.elements.map((el, i) => (
          <span
            key={i}
            className={styles.elementChip}
            style={{ background: STATE_COLORS[el.state] || 'var(--bg-tertiary)' }}
            title={`${el.value} (${el.state})`}
          >
            {el.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function PipelineViz({ stages }) {
  if (!stages || stages.length === 0) return null;
  return (
    <div className={styles.pipelineRow}>
      {stages.map((stage, i) => (
        <div key={i} className={styles.stageWrap}>
          <StageCard stage={stage} idx={i} isActive={stage.active} />
          {i < stages.length - 1 && (
            <span className={styles.arrow}>&#8594;</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultBox({ result }) {
  if (!result) return null;
  return (
    <div className={styles.resultBox}>
      <span className={styles.resultLabel}>Result:</span>
      <span className={styles.resultValue}>{result}</span>
    </div>
  );
}

function OpsLog({ ops = [] }) {
  if (!ops.length) return null;
  return (
    <div className={styles.opsLog}>
      {ops.slice(-5).map((op, i) => (
        <div key={i} className={`${styles.opEntry} ${styles[`op-${op.type === 'error' ? 'error' : op.type}`]}`}>
          <span className={styles.opDot} />
          {op.msg}
        </div>
      ))}
    </div>
  );
}

function ExceptionBanner({ exception }) {
  if (!exception) return null;
  return (
    <div className={styles.exceptionBanner}>
      <span className={styles.excIcon}>💥</span>
      <div>
        <div className={styles.excType}>{exception.type}</div>
        <div className={styles.excMsg}>{exception.msg}</div>
      </div>
    </div>
  );
}

function PipelineLabel({ label }) {
  if (!label) return null;
  return <div className={styles.pipelineLabel}>{label}</div>;
}

export default function JavaStreamsVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(STREAM_SCENARIOS);
  const [activeCat, setActiveCat] = useState(STREAM_CATEGORIES[0].key);

  const filtered = STREAM_SCENARIOS.filter(s => s.category === activeCat);
  const categories = STREAM_CATEGORIES;

  function handleCatChange(cat) {
    setActiveCat(cat);
    const first = STREAM_SCENARIOS.find(s => s.category === cat);
    if (first) select(first.id);
  }

  return (
    <div className={styles.wrapper}>
      {/* Pipeline label */}
      <PipelineLabel label={viz?.pipelineLabel} />

      {/* Category tabs */}
      <div className={styles.catTabs}>
        {categories.map(c => {
          const count = STREAM_SCENARIOS.filter(s => s.category === c.key).length;
          return (
            <button
              key={c.key}
              className={`${styles.catTab} ${activeCat === c.key ? styles.catTabActive : ''}`}
              onClick={() => handleCatChange(c.key)}
            >
              {c.icon} {c.label}
              {count > 0 && <span className={styles.catCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Scenario selector */}
      <div className={styles.scenarioRow}>
        {filtered.map(s => (
          <button
            key={s.id}
            className={`${styles.scenBtn} ${activeId === s.id ? styles.scenBtnActive : ''}`}
            onClick={() => select(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
        {filtered.length === 0 && (
          <span className={styles.emptyState}>No scenarios for this category.</span>
        )}
      </div>

      {/* Narration */}
      <NarrationPanel inline />

      {/* Exception banner */}
      {viz?.exception && <ExceptionBanner exception={viz.exception} />}

      {/* Pipeline visualization */}
      <div className={styles.vizArea}>
        <PipelineViz stages={viz?.stages} />
        <ResultBox result={viz?.result} />
        {viz?.opsLog && <OpsLog ops={viz.opsLog} />}
      </div>

      {/* Bottom panels */}
      <div className={styles.bottom}>
        <CodePanel code={active?.code} language={active?.language} />
      </div>

      <StepControls />
    </div>
  );
}
