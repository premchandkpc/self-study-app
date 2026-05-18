import { useParams, useNavigate } from 'react-router-dom';
import { TOPICS } from '../../core/constants/topics';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Topics.module.css';

const TOPIC_META = {
  dsa:           { color: 'blue',   desc: 'Arrays, Graphs, Trees, DP, Matrix, Strings with step-by-step simulation.' },
  java:          { color: 'yellow', desc: 'JVM internals, GC algorithms, thread lifecycle, locks, streams.' },
  golang:        { color: 'blue',   desc: 'Goroutines, channels, Go scheduler, gRPC patterns.' },
  python:        { color: 'green',  desc: 'Async I/O, GIL, decorators, ML pipelines.' },
  kubernetes:    { color: 'blue',   desc: 'Pod scheduling, HPA, rolling deployments, service mesh.' },
  aws:           { color: 'yellow', desc: 'EC2, Lambda, SQS, EKS, API Gateway architecture flows.' },
  kafka:         { color: 'red',    desc: 'Partitions, ISR, consumer groups, lag, leader election.' },
  'system-design': { color: 'purple', desc: 'Load balancers, CDN, caching, Raft consensus, CAP theorem.' },
};

const VISUALIZER_MAP = {
  'dsa:Arrays':             'array',
  'dsa:Graphs':             'graph',
  'dsa:Trees':              'tree',
  'java:JVM':               'jvm',
  'java:GC':                'jvm',
  'java:Threads':           'threads',
  'kafka:Partitions':       'kafka',
  'kubernetes:Pods':        'kubernetes',
  'kubernetes:HPA':         'kubernetes',
  'kubernetes:Deployments': 'kubernetes',
};

export default function Topics() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  if (topicId) return <TopicDetail topicId={topicId} navigate={navigate} />;
  return <TopicsList navigate={navigate} />;
}

function TopicsList({ navigate }) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.sub}>Choose a subject to explore</p>
      </div>

      <div className={styles.grid}>
        {TOPICS.map((topic, i) => {
          const meta = TOPIC_META[topic.id] || {};
          return (
            <AnimatedBox key={topic.id} animation="slide-up" delay={i * 50}>
              <Card
                variant="elevated"
                hoverable
                className={styles.card}
                onClick={() => navigate(`/topics/${topic.id}`)}
              >
                <CardHeader
                  icon={topic.icon}
                  title={topic.label}
                  subtitle={`${topic.subtopics.length} modules`}
                />
                <CardBody>
                  <p className={styles.desc}>{meta.desc}</p>
                  <div className={styles.tags}>
                    {topic.subtopics.slice(0, 4).map((sub) => (
                      <Badge key={sub} variant={meta.color || 'default'} size="xs">{sub}</Badge>
                    ))}
                    {topic.subtopics.length > 4 && (
                      <Badge variant="default" size="xs">+{topic.subtopics.length - 4}</Badge>
                    )}
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

function TopicDetail({ topicId, navigate }) {
  const topic = TOPICS.find((t) => t.id === topicId);
  const meta  = TOPIC_META[topicId] || {};

  if (!topic) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>Topic not found.</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/topics')}>← Topics</Button>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>{topic.icon}</span>
          <div>
            <h1 className={styles.title}>{topic.label}</h1>
            <p className={styles.sub}>{meta.desc}</p>
          </div>
        </div>
      </div>

      <div className={styles.modulesGrid}>
        {topic.subtopics.map((sub, i) => {
          const vizKey = `${topicId}:${sub}`;
          const hasViz = !!VISUALIZER_MAP[vizKey];
          return (
            <AnimatedBox key={sub} animation="slide-up" delay={i * 40}>
              <Card variant="default" hoverable className={styles.moduleCard}>
                <div className={styles.moduleTop}>
                  <span className={styles.moduleIcon}>{topic.icon}</span>
                  <span className={styles.moduleName}>{sub}</span>
                  {hasViz && <Badge variant={meta.color || 'blue'} size="xs" dot>Live Sim</Badge>}
                </div>
                <div className={styles.moduleActions}>
                  {hasViz && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="▶"
                      onClick={() => navigate(`/visualizer/${VISUALIZER_MAP[vizKey]}`)}
                    >
                      Simulate
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" icon="📖">
                    Study
                  </Button>
                </div>
              </Card>
            </AnimatedBox>
          );
        })}
      </div>
    </div>
  );
}
