import { useNavigate } from 'react-router-dom';
import Button from '../../components/shared/Button/Button';
import Card, { CardHeader } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Topics.module.css';

const UBER_COMPONENTS = [
  { id: 'uber',     label: 'Ride Flow',         icon: '🚗', desc: 'Full ride lifecycle: Rider→Gateway→Auth→Match→Redis→Pricing→Kafka→Trip→PG→Payment.',         viz: 'uber' },
  { id: 'arch',     label: 'Bounded Contexts',   icon: '🏛️', desc: 'DDD architecture: Rider Booking, Ride Execution, Payment, Notification bounded contexts.',  viz: 'uber' },
  { id: 'failures', label: 'Failure Modes',      icon: '💥', desc: 'Real-world incidents: Redis outage, Kafka lag, DB overload, cascading failures.',             viz: 'uber' },
];

export default function UberDetail() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/topics/system-design')}>
          ← System Design
        </Button>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>🚗</span>
          <div>
            <h1 className={styles.title}>Uber System Design</h1>
            <p className={styles.sub}>
              14 components across 5 layers — explore each sub-system below.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.modulesGrid}>
        {UBER_COMPONENTS.map((comp, i) => (
          <AnimatedBox key={comp.id} animation="slide-up" delay={i * 40}>
            <Card variant="default" hoverable className={styles.moduleCard}>
              <CardHeader icon={comp.icon} title={comp.label} />
              <p className={styles.desc}>{comp.desc}</p>
              <div className={styles.moduleActions}>
                <Button
                  variant="primary"
                  size="sm"
                  icon="▶"
                  onClick={() => navigate(`/visualizer/${comp.viz}`)}
                >
                  Simulate
                </Button>
                <Badge variant="purple" size="xs" dot>
                  Live Sim
                </Badge>
              </div>
            </Card>
          </AnimatedBox>
        ))}
      </div>
    </div>
  );
}
