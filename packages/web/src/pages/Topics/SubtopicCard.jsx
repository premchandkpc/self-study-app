import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import { buildSubtopicLearnRoute, buildSubtopicRoute, slugify } from '../../core/topics/topicRoutes';
import { useTopicMapsContext } from '../../core/context/TopicMapsContext';
import styles from './Topics.module.css';

export default function SubtopicCard({ topicAbbr, topicIcon, subtopic, color, delay = 0 }) {
  const navigate = useNavigate();
  const { VISUALIZER_MAP, SUBTOPIC_SCENARIO_ID, ABBR_MAP } = useTopicMapsContext();
  const topicData = ABBR_MAP[topicAbbr];
  const topicId = topicData?.id;
  const subtopicName = typeof subtopic === 'string' ? subtopic : subtopic.name;
  const subtopicSlug = typeof subtopic === 'string' ? slugify(subtopic) : (subtopic.slug || slugify(subtopic.name));
  const vizKey = `${topicId}:${subtopicName}`;
  const hasViz = !!VISUALIZER_MAP[vizKey];
  const scenarioId = SUBTOPIC_SCENARIO_ID[vizKey];
  const slug = scenarioId || subtopicSlug;
  const simulateRoute = buildSubtopicRoute(topicAbbr, slug);
  const learnRoute = buildSubtopicLearnRoute(topicAbbr, slug);

  function handleCardClick() {
    navigate(learnRoute);
  }

  function handleSimulateClick(e) {
    e.stopPropagation();
    navigate(simulateRoute);
  }

  function handleStudyClick(e) {
    e.stopPropagation();
    navigate(learnRoute);
  }

  return (
    <AnimatedBox animation="slide-up" delay={delay}>
      <Card variant="default" hoverable className={styles.moduleCard}
        onClick={handleCardClick}>
        <div className={styles.moduleTop}>
          <span className={styles.moduleIcon}>{topicIcon}</span>
          <span className={styles.moduleName}>{subtopicName}</span>
          {hasViz && <Badge variant={color || 'blue'} size="xs" dot>Live Sim</Badge>}
        </div>
        <div className={styles.moduleActions}>
          {hasViz && scenarioId && (
            <Button
              variant="primary"
              size="sm"
              icon="▶"
              onClick={handleSimulateClick}
            >
              Simulate
            </Button>
          )}
          <Button variant="ghost" size="sm" icon="📖" onClick={handleStudyClick}>
            Study
          </Button>
        </div>
      </Card>
    </AnimatedBox>
  );
}
