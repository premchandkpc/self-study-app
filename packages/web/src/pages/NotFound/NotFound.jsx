import { useNavigate } from 'react-router-dom';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './NotFound.module.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <AnimatedBox animation="bounce-in" className={styles.content}>
        <div className={styles.code}>404</div>
        <div className={styles.glitch}>404</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.desc}>
          This route doesn't exist in the cluster. Pod might have crashed.
        </p>
        <div className={styles.actions}>
          <Button variant="gradient" onClick={() => navigate('/')}>
            ← Back to Home
          </Button>
          <Button variant="secondary" onClick={() => navigate('/topics')}>
            Browse Topics
          </Button>
        </div>
        <div className={styles.terminal}>
          <span className={styles.prompt}>$</span>
          <span className={styles.cmd}>kubectl get pod/this-page -n study-lab</span>
          <br />
          <span className={styles.err}>Error from server (NotFound): pods "this-page" not found</span>
        </div>
      </AnimatedBox>
    </div>
  );
}
