import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import { useUI } from '../../../core/context/useUI';
import styles from './MainLayout.module.css';

export default function MainLayout({ children, onSelectTopic: _onSelectTopic }) {
  const { state, actions } = useUI();
  const sidebarCollapsed = state.sidebarCollapsed;
  const sidebarMode = state.sidebarMode;

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
