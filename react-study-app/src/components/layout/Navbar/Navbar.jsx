import { NavLink as RouterNavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../core/context/ThemeContext';
import { useAppState } from '../../../core/context/AppStateContext';
import { THEME_LABELS } from '../../../core/constants/themes';
import styles from './Navbar.module.css';

export default function Navbar({ onMenuToggle }) {
  const { theme, setTheme } = useTheme();
  const { state, actions } = useAppState();
  const navigate = useNavigate();
  const themeOpen = state.ui.themeOpen;
  const sidebarMode = state.ui.sidebarMode;

  const modeIcons = {
    'all': '📋',
    'current-topic': '📌',
    'hidden': '👁️',
  };

  const modeLabels = {
    'all': 'All Topics',
    'current-topic': 'Current Topic',
    'hidden': 'Hidden',
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Toggle sidebar">
          <span />
          <span />
          <span />
        </button>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🚀</span>
          <span className={styles.brandName}>Study<span className={styles.brandAccent}>Lab</span></span>
        </div>
      </div>

      <nav className={styles.center}>
        <NavItem to="/" label="Home" />
        <NavItem to="/topics" label="Topics" />
        <NavItem to="/visualizer/java-collections" label="Java Collections" />
        <NavItem to="/visualizer/array" label="DSA" />
        <NavItem to="/visualizer/graph" label="Graphs" />
        <NavItem to="/interview" label="Interview" />
        <NavItem to="/compiler" label="Compiler" />
      </nav>

      <div className={styles.right}>
        <button
          className={styles.sidebarModeBtn}
          onClick={() => actions.cycleSidebarMode()}
          title={`Sidebar: ${modeLabels[sidebarMode]}`}
          aria-label="Cycle sidebar view mode"
        >
          {modeIcons[sidebarMode]}
        </button>
        <div className={styles.themeSelector}>
          <button
            className={styles.themeBtn}
            onClick={() => actions.setThemeOpen(!themeOpen)}
            aria-label="Switch theme"
          >
            🎨 {THEME_LABELS[theme]}
          </button>
          {themeOpen && (
            <div className={styles.themeDropdown}>
              {Object.entries(THEME_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`${styles.themeOption} ${theme === key ? styles.active : ''}`}
                  onClick={() => { setTheme(key); actions.setThemeOpen(false); }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className={styles.interviewBtn} onClick={() => navigate('/interview')}>Interview Mode</button>
      </div>
    </header>
  );
}

function NavItem({ to, label }) {
  return (
    <RouterNavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
      }
    >
      {label}
    </RouterNavLink>
  );
}
