import { useState } from 'react';
import { useTheme } from '../../../core/context/ThemeContext';
import { THEMES, THEME_LABELS } from '../../../core/constants/themes';
import styles from './Navbar.module.css';

export default function Navbar({ onMenuToggle }) {
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);

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
        <NavLink href="#dsa" label="DSA" />
        <NavLink href="#java" label="Java" />
        <NavLink href="#golang" label="Go" />
        <NavLink href="#kubernetes" label="K8s" />
        <NavLink href="#system-design" label="Systems" />
      </nav>

      <div className={styles.right}>
        <div className={styles.themeSelector}>
          <button
            className={styles.themeBtn}
            onClick={() => setThemeOpen(!themeOpen)}
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
                  onClick={() => { setTheme(key); setThemeOpen(false); }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className={styles.interviewBtn}>Interview Mode</button>
      </div>
    </header>
  );
}

function NavLink({ href, label }) {
  return (
    <a href={href} className={styles.navLink}>
      {label}
    </a>
  );
}
