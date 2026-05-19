import { useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import CompilerTemplate from '../../components/templates/CompilerTemplate/CompilerTemplate';
import Button from '../../components/shared/Button/Button';
import styles from './CompilerPage.module.css';

export default function CompilerPage() {
  const navigate = useNavigate();
  return (
    <SimulationProvider>
      <div className={styles.page}>
        <div className={styles.header}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
          <div className={styles.meta}>
            <span className={styles.icon}>⚙</span>
            <div>
              <h1 className={styles.title}>Code Compiler</h1>
              <p className={styles.sub}>Paste any JS function — step through every variable live</p>
            </div>
          </div>
        </div>
        <CompilerTemplate />
      </div>
    </SimulationProvider>
  );
}
