import { useNavigate } from 'react-router-dom';
import { COLLECTIONS, COLLECTION_CATEGORIES } from '../../core/constants/collections';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Collections.module.css';

export default function CollectionsList() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Collections</h1>
        <p className={styles.sub}>Scenarios organized by concurrency, edge cases, situations, and exceptions</p>
      </div>

      <div className={styles.grid}>
        {COLLECTIONS.map((col, i) => {
          const totalScenarios = COLLECTION_CATEGORIES.reduce(
            (sum, cat) => sum + (col.scenarios[cat.key]?.length || 0),
            0
          );
          return (
            <AnimatedBox key={col.id} animation="slide-up" delay={i * 60}>
              <Card
                variant="elevated"
                hoverable
                className={styles.collectionCard}
                onClick={() => navigate(`/collections/${col.id}`)}
              >
                <CardHeader
                  icon={col.icon}
                  title={col.label}
                  subtitle={`${totalScenarios} scenarios`}
                />
                <CardBody>
                  <p className={styles.desc}>{col.desc}</p>
                  <div className={styles.categoryCount}>
                    {COLLECTION_CATEGORIES.map((cat) => {
                      const count = col.scenarios[cat.key]?.length || 0;
                      return count > 0 ? (
                        <span key={cat.key} className={styles.categoryPill}>
                          <span>{cat.icon}</span>
                          <span>{count}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className={styles.tags} style={{ marginTop: 'var(--space-sm)' }}>
                    {COLLECTION_CATEGORIES.map((cat) => (
                      <Badge key={cat.key} variant={col.color || 'default'} size="xs">
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </AnimatedBox>
          );
        })}
      </div>
    </div>
  );
}
