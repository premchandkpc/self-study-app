import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLLECTIONS, COLLECTION_CATEGORIES } from '../../core/constants/collections';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import styles from './Collections.module.css';

export default function CollectionDetail({ collectionId }) {
  const navigate = useNavigate();
  const collection = COLLECTIONS.find((c) => c.id === collectionId);
  const [activeCategory, setActiveCategory] = useState(COLLECTION_CATEGORIES[0].key);

  if (!collection) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>Collection not found: {collectionId}</p>
        <Button variant="secondary" onClick={() => navigate('/collections')}>← Back</Button>
      </div>
    );
  }

  const activeScenarios = collection.scenarios[activeCategory] || [];
  const activeCat = COLLECTION_CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/collections')}>← Collections</Button>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>{collection.icon}</span>
          <div className={styles.detailMeta}>
            <h1 className={styles.title}>{collection.label}</h1>
            <p className={styles.sub}>{collection.desc}</p>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {COLLECTION_CATEGORIES.map((cat) => {
          const count = collection.scenarios[cat.key]?.length || 0;
          return (
            <button
              key={cat.key}
              className={`${styles.tab} ${activeCategory === cat.key ? styles.tabActive : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <span className={styles.tabIcon}>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && <span className={styles.tabCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.categoryHeader}>
        <h2 className={styles.categoryTitle}>{activeCat?.icon} {activeCat?.label}</h2>
        <p className={styles.categoryDesc}>{activeCat?.desc}</p>
      </div>

      {activeScenarios.length === 0 ? (
        <p className={styles.sub}>No scenarios yet for this category.</p>
      ) : (
        <div className={styles.scenarioGrid}>
          {activeScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`${styles.scenarioCard} ${scenario.comingSoon ? styles.comingSoon : ''}`}
            >
              <div className={styles.scenarioTop}>
                <span className={styles.scenarioIcon}>{scenario.icon}</span>
                <span className={styles.scenarioName}>{scenario.label}</span>
                {scenario.comingSoon
                  ? <Badge variant="default" size="xs">Soon</Badge>
                  : <Badge variant={collection.color || 'blue'} size="xs" dot>Live</Badge>
                }
              </div>

              <p className={styles.scenarioDesc}>{scenario.desc}</p>

              {scenario.code && (
                <pre className={styles.scenarioCode}>{scenario.code.join('\n')}</pre>
              )}

              {scenario.tags?.length > 0 && (
                <div className={styles.scenarioTags}>
                  {scenario.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}

              <div className={styles.scenarioActions}>
                {!scenario.comingSoon && scenario.vizType ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon="▶"
                    onClick={() => navigate(`/visualizer/${scenario.vizType}`)}
                  >
                    Simulate
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled>Coming Soon</Button>
                )}
                <Button variant="ghost" size="sm" icon="📖">Study</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
