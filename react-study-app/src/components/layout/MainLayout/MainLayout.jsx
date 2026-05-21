import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import { useAppState } from '../../../core/context/AppStateContext';
import styles from './MainLayout.module.css';

export default function MainLayout({ children, onSelectTopic }) {
  const { state, actions } = useAppState();
  const sidebarCollapsed = state.ui.sidebarCollapsed;
  const sidebarMode = state.ui.sidebarMode;

  return (
    <div className={styles.root}>
      <Navbar onMenuToggle={() => actions.toggleSidebar()} />
      <Sidebar collapsed={sidebarCollapsed} />
      <main
        className={`${styles.main} ${sidebarCollapsed ? styles.mainExpanded : ''} ${sidebarMode === 'hidden' ? styles.mainFullWidth : ''}`}
      >
        {children}
      </main>
    </div>
  );
}
