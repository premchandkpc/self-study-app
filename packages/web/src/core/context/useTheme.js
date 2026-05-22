import { useContext } from 'react';
import { ThemeContext } from './ThemeContextValue';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
