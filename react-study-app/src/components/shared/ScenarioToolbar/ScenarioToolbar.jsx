import Button from '../Button/Button';
import NarrationPanel from '../NarrationPanel/NarrationPanel';
import styles from './ScenarioToolbar.module.css';

export default function ScenarioToolbar({ scenarios, active, onChange }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs}>
        {scenarios.map((sc) => (
          <Button
            key={sc.id}
            variant={active === sc.id ? 'primary' : 'ghost'}
            size="sm"
            icon={sc.icon}
            onClick={() => onChange(sc.id)}
          >
            {sc.label}
          </Button>
        ))}
      </div>
      <NarrationPanel />
    </div>
  );
}
