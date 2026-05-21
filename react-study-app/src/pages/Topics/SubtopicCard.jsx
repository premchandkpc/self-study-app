import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import { VISUALIZER_MAP } from '../../core/constants/topicMeta';
import { SUBTOPIC_ROUTES } from '../../core/constants/routes';
import styles from './Topics.module.css';

export default function SubtopicCard({ topicId, topicIcon, subtopic, color, delay = 0 }) {
  const navigate = useNavigate();
  const vizKey = `${topicId}:${subtopic}`;
  const vizType = VISUALIZER_MAP[vizKey];
  const hasViz = !!vizType;
  const routeKey = `${topicId}:${subtopic}`;
  const detailRoute = SUBTOPIC_ROUTES[routeKey];

  function handleCardClick() {
    if (detailRoute) {
      navigate(detailRoute);
    } else {
      navigate(`/topics/${topicId}/${subtopic}/learn`);
    }
  }

  function handleStudyClick(e) {
    e.stopPropagation();
    navigate(`/topics/${topicId}/${subtopic}/learn`);
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
          {hasViz && (
            <Button
              variant="primary"
              size="sm"
              icon="▶"
              onClick={(e) => { e.stopPropagation(); navigate(`/visualizer/${vizType}`); }}
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
