import { useNavigate } from 'react-router-dom';
import { buildSubtopicRoute } from '../../core/topics/topicRoutes';
import DetailPageHeader from '../../components/shared/DetailPageHeader/DetailPageHeader';
import Button from '../../components/shared/Button/Button';
import Card, { CardHeader } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Topics.module.css';

const UBER_COMPONENTS = [
  {
    id: 'uber',
    label: 'Ride Request Flow',
    icon: '🚗',
    desc: 'Full ride lifecycle: Rider→API Gateway→Auth Service→Matching Engine→Redis Cache→Pricing Service→Kafka Event Stream→Trip Service→PostgreSQL→Payment Processor. Learn how 14 services coordinate to fulfill a single ride request.',
    viz: 'uber',
    steps: [
      'User requests ride',
      'Request routed through API Gateway',
      'Authentication & authorization',
      'Matching algorithm finds driver',
      'Redis caches driver location',
      'Pricing calculated',
      'Event published to Kafka',
      'Trip details stored in DB',
      'Payment processed'
    ]
  },
  {
    id: 'arch',
    label: 'Bounded Contexts',
    icon: '🏛️',
    desc: 'Domain-driven design: Separate bounded contexts for Rider Booking, Ride Execution, Payment Processing, and Notifications. Each owns its data, APIs, and business rules.',
    viz: 'uber',
    contexts: [
      'Rider Service: account, preferences, ratings',
      'Driver Service: profile, availability, ratings',
      'Matching Service: algorithms, matching strategies',
      'Payment Service: transactions, refunds, settlements',
      'Trip Service: route, duration, cost tracking'
    ]
  },
  {
    id: 'failures',
    label: 'Failure Modes & Recovery',
    icon: '💥',
    desc: 'Real-world incidents: Redis outage → in-memory cache invalidation, Kafka lag → delayed events & retries, DB overload → circuit breaker activation, cascading failures → bulkhead isolation.',
    viz: 'uber',
    scenarios: [
      'Redis outage: fallback to database',
      'Kafka lag: queue backpressure, retry strategy',
      'Database overload: connection pooling, rate limiting',
      'Network partition: circuit breaker, timeout',
      'Service down: graceful degradation, fallback APIs'
    ]
  },
];

export default function UberDetail() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <DetailPageHeader
        backLabel="System Design"
        onBack={() => navigate('/sd')}
        icon="🚗"
        title="Uber System Design"
        desc="14 components across 5 layers — explore each sub-system below."
      />

      <div className={styles.modulesGrid}>
        {UBER_COMPONENTS.map((comp, i) => (
          <AnimatedBox key={comp.id} animation="slide-up" delay={i * 40}>
            <Card variant="default" hoverable className={styles.moduleCard}>
              <CardHeader icon={comp.icon} title={comp.label} />
              <p className={styles.desc}>{comp.desc}</p>

              {comp.steps && (
                <div className={styles.detailSection}>
                  <h4 className={styles.detailTitle}>Steps:</h4>
                  <ol className={styles.detailList}>
                    {comp.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {comp.contexts && (
                <div className={styles.detailSection}>
                  <h4 className={styles.detailTitle}>Services:</h4>
                  <ul className={styles.detailList}>
                    {comp.contexts.map((ctx, idx) => (
                      <li key={idx}>{ctx}</li>
                    ))}
                  </ul>
                </div>
              )}

              {comp.scenarios && (
                <div className={styles.detailSection}>
                  <h4 className={styles.detailTitle}>Scenarios:</h4>
                  <ul className={styles.detailList}>
                    {comp.scenarios.map((scenario, idx) => (
                      <li key={idx}>{scenario}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.moduleActions}>
                <Button
                  variant="primary"
                  size="sm"
                  icon="▶"
                  onClick={() => navigate(buildSubtopicRoute('systemdesign', comp.viz))}
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
