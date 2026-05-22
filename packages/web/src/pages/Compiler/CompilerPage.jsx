import { SimulationProvider } from '../../core/context/SimulationContext';
import CompilerTemplate from '../../components/templates/CompilerTemplate/CompilerTemplate';
import styles from './CompilerPage.module.css';

export default function CompilerPage() {
  return (
    <SimulationProvider>
      <div className={styles.page}>
        <CompilerTemplate />
      </div>
    </SimulationProvider>
  );
}
