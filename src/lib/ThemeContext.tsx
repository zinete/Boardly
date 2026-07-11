import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  themes,
  type Theme,
  getThemeById,
  defaultThemeId,
  applyThemeToElement,
} from './themes';

const STORAGE_KEY = 'boardly-theme';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Detect whether the user prefers dark mode at the OS level.
 */
function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the initial theme id from localStorage or system preference.
 */
function resolveInitialThemeId(): string {
  // 1. Check localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && getThemeById(saved)) return saved;
  } catch {
    // localStorage unavailable – fall through
  }

  // 2. System preference
  return prefersDark() ? 'dark' : defaultThemeId;
}

/**
 * Apply the theme immediately (used both in React and in the inline script).
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  applyThemeToElement(theme, root);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const id = resolveInitialThemeId();
    return getThemeById(id) ?? getThemeById(defaultThemeId)!;
  });

  const setTheme = useCallback((themeId: string) => {
    const theme = getThemeById(themeId);
    if (!theme) return;
    setCurrentTheme(theme);
  }, []);

  // Apply theme whenever it changes (and persist)
  useEffect(() => {
    applyTheme(currentTheme);
    try {
      localStorage.setItem(STORAGE_KEY, currentTheme.id);
    } catch {
      // ignore
    }
  }, [currentTheme]);

  // Listen for system preference changes (only when no explicit saved theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly saved a non light/dark theme
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && saved !== 'light' && saved !== 'dark') return;
      } catch {
        // ignore
      }
      const newTheme = getThemeById(e.matches ? 'dark' : 'light');
      if (newTheme) setCurrentTheme(newTheme);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
