import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import { VISUALIZER_MAP, SUBTOPIC_SCENARIO_ID } from '../../core/constants/topicMeta';
import { SUBTOPIC_ROUTES } from '../../core/constants/routes';
import styles from './Topics.module.css';

export default function SubtopicCard({ topicId, topicIcon, subtopic, color, delay = 0 }) {
  const navigate = useNavigate();
  const vizKey = `${topicId}:${subtopic}`;
  const vizType = VISUALIZER_MAP[vizKey];
  const hasViz = !!vizType;
  const routeKey = `${topicId}:${subtopic}`;
  const detailRoute = SUBTOPIC_ROUTES[routeKey];
  const scenarioId = SUBTOPIC_SCENARIO_ID[routeKey];

  function handleCardClick() {
    if (hasViz && scenarioId) {
      navigate(`/${vizType}/${scenarioId}`);
    } else if (hasViz) {
      navigate(`/${vizType}`);
    } else {
      navigate(`/topics/${topicId}`);
    }
  }

  function handleSimulateClick(e) {
    e.stopPropagation();
    navigate(`/${vizType}/${scenarioId}`);
  }

  function handleStudyClick(e) {
    e.stopPropagation();
    if (scenarioId) {
      navigate(`/${vizType}/${scenarioId}`);
    } else if (hasViz) {
      navigate(`/${vizType}`);
    } else {
      navigate(`/topics/${topicId}`);
    }
  }

  return (
    <AnimatedBox animation="slide-up" delay={delay}>
      <Card variant="default" hoverable className={styles.moduleCard}
        onClick={handleCardClick}>
        <div className={styles.moduleTop}>
          <span className={styles.moduleIcon}>{topicIcon}</span>
          <span className={styles.moduleName}>{subtopic}</span>
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
