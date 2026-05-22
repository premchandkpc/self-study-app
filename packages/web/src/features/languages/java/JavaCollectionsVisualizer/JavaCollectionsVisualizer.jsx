import { memo, useState } from 'react';
import { useVisualizerScenario } from '../../../../core/hooks/useVisualizerScenario';
import { JC_SCENARIOS } from './java-collections-engine';
import { JC_COLLECTION_TYPES, JC_CATEGORIES } from './jc-constants';
import { OpsLog } from './shared/OpsLog';
import { ExceptionBanner } from './shared/ExceptionBanner';
import { ArrayListRenderer, LinkedListRenderer, BucketRenderer, TreeMapRenderer, PriorityQueueRenderer, ArrayDequeRenderer, ConcurrentHashMapRenderer, CopyOnWriteRenderer } from './types';
import StepControls from '../../shared/StepControls/StepControls';
import CodePanel from '../../shared/CodePanel/CodePanel';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import styles from './JavaCollectionsVisualizer.module.css';

function VizRenderer({ viz }) {
  if (!viz) return null;
  switch (viz.collectionType) {
    case 'arraylist':          return <ArrayListRenderer viz={viz} />;
    case 'linkedlist':         return <LinkedListRenderer viz={viz} />;
    case 'hashmap':
    case 'hashset':            return <BucketRenderer viz={viz} />;
    case 'treemap':            return <TreeMapRenderer viz={viz} />;
    case 'priorityqueue':      return <PriorityQueueRenderer viz={viz} />;
    case 'arraydeque':         return <ArrayDequeRenderer viz={viz} />;
    case 'concurrenthashmap':
    case 'concurrent':         return <ConcurrentHashMapRenderer viz={viz} />;
    case 'copyonwritearraylist': return <CopyOnWriteRenderer viz={viz} />;
    default:                   return <div className={styles.emptyState}>Renderer not found: {viz.collectionType}</div>;
  }
}

const JavaCollectionsVisualizerComponent = memo(function JavaCollectionsVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(JC_SCENARIOS);
  const [activeType, setActiveType] = useState(JC_SCENARIOS[0].collectionType);
  const [activeCat,  setActiveCat]  = useState(JC_SCENARIOS[0].category);

  const filteredByType = JC_SCENARIOS.filter(s => s.collectionType === activeType);
  const filteredByCat  = filteredByType.filter(s => s.category === activeCat);

  function handleTypeChange(type) {
    setActiveType(type);
    const first = JC_SCENARIOS.find(s => s.collectionType === type && s.category === activeCat)
      ?? JC_SCENARIOS.find(s => s.collectionType === type);
    if (first) select(first.id);
  }

  function handleCatChange(cat) {
    setActiveCat(cat);
    const first = JC_SCENARIOS.find(s => s.collectionType === activeType && s.category === cat);
    if (first) select(first.id);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.typeTabs}>
        {JC_COLLECTION_TYPES.map(t => (
          <button key={t.key} className={`${styles.typeTab} ${activeType === t.key ? styles.typeTabActive : ''}`} onClick={() => handleTypeChange(t.key)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className={styles.catTabs}>
        {JC_CATEGORIES.map(c => {
          const count = filteredByType.filter(s => s.category === c.key).length;
          return (
            <button key={c.key} className={`${styles.catTab} ${activeCat === c.key ? styles.catTabActive : ''}`} onClick={() => handleCatChange(c.key)}>
              {c.icon} {c.label} {count > 0 && <span className={styles.catCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.scenarioRow}>
        {filteredByCat.map(s => (
          <button key={s.id} className={`${styles.scenBtn} ${activeId === s.id ? styles.scenBtnActive : ''}`} onClick={() => select(s.id)}>
            {s.icon} {s.label}
          </button>
        ))}
        {filteredByCat.length === 0 && <span className={styles.emptyState}>No scenarios for this combination.</span>}
      </div>

      <NarrationPanel inline />
      {viz?.exception && <ExceptionBanner exception={viz.exception} />}

      <div className={styles.vizArea}>
        <VizRenderer viz={viz} />
        {viz?.ops && <OpsLog ops={viz.ops} />}
      </div>

      <div className={styles.bottom}>
        <CodePanel code={active?.code} language={active?.language} />
      </div>

      <StepControls />
    </div>
  );
});

export default JavaCollectionsVisualizerComponent;
