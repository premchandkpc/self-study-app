import { useState, useEffect } from 'react';
import { DEFAULT_THEME } from '../constants/themes';
import { ThemeContext } from './ThemeContextValue';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('study-theme') || DEFAULT_THEME
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('study-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}


