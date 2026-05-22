import { useState } from 'react';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SPRING_SCENARIOS, SPRING_CATEGORIES } from './spring-engine';
import StepControls from '../../../components/shared/StepControls/StepControls';
import CodePanel from '../../../components/shared/CodePanel/CodePanel';
import NarrationPanel from '../../../components/shared/NarrationPanel/NarrationPanel';
import styles from './SpringVisualizer.module.css';

const STATE_COLORS = {
  idle: 'var(--bg-tertiary)',
  active: 'var(--node-comparing)',
  new: 'var(--node-default)',
  filtered: 'var(--pod-crash)',
  error: 'var(--pod-crash)',
  ok: 'var(--pod-running)',
  warn: 'var(--node-comparing)',
};

const TYPE_COLORS = {
  entry: 'var(--accent-blue)',
  handler: 'var(--node-comparing)',
  action: 'var(--node-default)',
  phase: 'var(--node-path)',
  tx: 'var(--pod-running)',
  state: 'var(--accent-blue)',
  proxy: 'var(--node-comparing)',
  target: 'var(--node-default)',
  decision: 'var(--node-comparing)',
  warning: 'var(--pod-crash)',
  scope: 'var(--node-path)',
  outcome: 'var(--node-comparing)',
  transition: 'var(--node-comparing)',
  exit: 'var(--pod-running)',
};

function StageBadge({ type }) {
  const bg = TYPE_COLORS[type];
  if (!bg) return null;
  return <span className={styles.stageBadge} style={{ background: bg }}>{type}</span>;
}

function StageCard({ stage, isActive }) {
  return (
    <div className={`${styles.stageCard} ${isActive ? styles.stageCardActive : ''}`}>
      <div className={styles.stageHeader}>
        <span className={styles.stageOp}>{stage.op}</span>
        <StageBadge type={stage.type} />
      </div>
      <div className={styles.itemsRow}>
        {(!stage.items || stage.items.length === 0) && (
          <span className={styles.emptyItems}>∅</span>
        )}
        {stage.items && stage.items.map((el, i) => (
          <span
            key={i}
            className={styles.itemChip}
            style={{ background: STATE_COLORS[el.state] || 'var(--bg-tertiary)' }}
            title={el.value}
          >
            {el.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function FlowViz({ stages }) {
  if (!stages || stages.length === 0) return null;
  return (
    <div className={styles.flowRow}>
      {stages.map((stage, i) => (
        <div key={i} className={styles.stageWrap}>
          <StageCard stage={stage} isActive={stage.active} />
          {i < stages.length - 1 && <span className={styles.arrow}>&#8594;</span>}
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
      {ops.slice(-6).map((op, i) => (
        <div key={i} className={`${styles.opEntry} ${styles[`op-${op.type === 'error' ? 'error' : op.type}`]}`}>
          <span className={styles.opDot} /> {op.msg}
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

function FlowLabel({ label }) {
  if (!label) return null;
  return <div className={styles.flowLabel}>{label}</div>;
}

export default function SpringVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(SPRING_SCENARIOS);
  const [activeCat, setActiveCat] = useState(SPRING_CATEGORIES[0].key);

  const filtered = SPRING_SCENARIOS.filter(s => s.category === activeCat);
  const categories = SPRING_CATEGORIES;

  function handleCatChange(cat) {
    setActiveCat(cat);
    const first = SPRING_SCENARIOS.find(s => s.category === cat);
    if (first) select(first.id);
  }

  return (
    <div className={styles.wrapper}>
      <FlowLabel label={viz?.pipelineLabel} />

      <div className={styles.catTabs}>
        {categories.map(c => {
          const count = SPRING_SCENARIOS.filter(s => s.category === c.key).length;
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
        {filtered.length === 0 && <span className={styles.emptyState}>No scenarios for this category.</span>}
      </div>

      <NarrationPanel inline />
      {viz?.exception && <ExceptionBanner exception={viz.exception} />}

      <div className={styles.vizArea}>
        <FlowViz stages={viz?.stages} />
        <ResultBox result={viz?.result} />
        {viz?.opsLog && <OpsLog ops={viz.opsLog} />}
      </div>

      <div className={styles.bottom}>
        <CodePanel code={active?.code} language={active?.language} />
      </div>

      <StepControls />
    </div>
  );
}
