import { useState } from 'react';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import styles from './MainLayout.module.css';

export default function MainLayout({ children, onSelectTopic }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.root}>
      <Navbar onMenuToggle={() => setSidebarCollapsed((v) => !v)} />
      <Sidebar
        collapsed={sidebarCollapsed}
        onSelectTopic={onSelectTopic}
      />
      <main
        className={`${styles.main} ${sidebarCollapsed ? styles.mainExpanded : ''}`}
      >
        {children}
      </main>
    </div>
  );
}
