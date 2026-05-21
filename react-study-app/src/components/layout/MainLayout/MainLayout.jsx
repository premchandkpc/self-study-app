import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import { useAppState } from '../../../core/context/AppStateContext';
import styles from './MainLayout.module.css';

export default function MainLayout({ children, onSelectTopic }) {
  const { state, actions } = useAppState();
  const sidebarCollapsed = state.ui.sidebarCollapsed;

  return (
    <div className={styles.root}>
      <Navbar onMenuToggle={() => actions.toggleSidebar()} />
      <Sidebar collapsed={sidebarCollapsed} />
      <main
        className={`${styles.main} ${sidebarCollapsed ? styles.mainExpanded : ''}`}
      >
        {children}
      </main>
    </div>
  );
}
