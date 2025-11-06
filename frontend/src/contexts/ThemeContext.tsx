'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeContextValue, ThemeMode, getTheme, resolveThemeMode } from '../styles/theme';

interface IThemeContextValue {
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  theme: 'light' | 'dark';
}

const ThemeContext = createContext<IThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultMode = 'system',
  storageKey = 'ui-theme',
}: {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Get stored mode or use default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as ThemeMode;
      return stored || defaultMode;
    }
    return defaultMode;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => resolveThemeMode(mode));

  useEffect(() => {
    const newTheme = resolveThemeMode(mode);
    setTheme(newTheme);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, mode);
    }
  }, [mode, storageKey]);

  const contextValue: IThemeContextValue = {
    mode,
    setMode,
    theme: theme as 'light' | 'dark',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}