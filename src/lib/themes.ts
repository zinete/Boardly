export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  colors: Record<string, string>;
}

const cssVarKeys = [
  'background', 'foreground', 'card', 'card-foreground',
  'popover', 'popover-foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
  'border', 'input', 'ring',
  'sidebar-background', 'sidebar-foreground',
  'sidebar-primary', 'sidebar-primary-foreground',
  'sidebar-accent', 'sidebar-accent-foreground',
  'sidebar-border', 'sidebar-ring',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
];

// Map from theme color keys to actual CSS variable names
// sidebar-background maps to --sidebar, etc.
const cssVarMap: Record<string, string> = {
  'sidebar-background': 'sidebar',
  'destructive-foreground': 'destructive-foreground',
};

function getCssVarName(key: string): string {
  return cssVarMap[key] || key;
}

export const defaultThemeId = 'light';

export const themes: Theme[] = [
  // ─── Light (default) ───
  {
    id: 'light',
    name: '浅色',
    description: '默认浅色主题，简洁明亮',
    isDark: false,
    colors: {
      'background': 'oklch(1 0 0)',
      'foreground': 'oklch(0.145 0 0)',
      'card': 'oklch(1 0 0)',
      'card-foreground': 'oklch(0.145 0 0)',
      'popover': 'oklch(1 0 0)',
      'popover-foreground': 'oklch(0.145 0 0)',
      'primary': 'oklch(0.205 0 0)',
      'primary-foreground': 'oklch(0.985 0 0)',
      'secondary': 'oklch(0.97 0 0)',
      'secondary-foreground': 'oklch(0.205 0 0)',
      'muted': 'oklch(0.97 0 0)',
      'muted-foreground': 'oklch(0.556 0 0)',
      'accent': 'oklch(0.97 0 0)',
      'accent-foreground': 'oklch(0.205 0 0)',
      'destructive': 'oklch(0.577 0.245 27.325)',
      'destructive-foreground': 'oklch(0.985 0 0)',
      'border': 'oklch(0.922 0 0)',
      'input': 'oklch(0.922 0 0)',
      'ring': 'oklch(0.708 0 0)',
      'sidebar-background': 'oklch(0.985 0 0)',
      'sidebar-foreground': 'oklch(0.145 0 0)',
      'sidebar-primary': 'oklch(0.205 0 0)',
      'sidebar-primary-foreground': 'oklch(0.985 0 0)',
      'sidebar-accent': 'oklch(0.97 0 0)',
      'sidebar-accent-foreground': 'oklch(0.205 0 0)',
      'sidebar-border': 'oklch(0.922 0 0)',
      'sidebar-ring': 'oklch(0.708 0 0)',
      'chart-1': 'oklch(0.87 0 0)',
      'chart-2': 'oklch(0.556 0 0)',
      'chart-3': 'oklch(0.439 0 0)',
      'chart-4': 'oklch(0.371 0 0)',
      'chart-5': 'oklch(0.269 0 0)',
    },
  },

  // ─── Dark ───
  {
    id: 'dark',
    name: '深色',
    description: '经典深色主题，护眼舒适',
    isDark: true,
    colors: {
      'background': 'oklch(0.145 0 0)',
      'foreground': 'oklch(0.985 0 0)',
      'card': 'oklch(0.205 0 0)',
      'card-foreground': 'oklch(0.985 0 0)',
      'popover': 'oklch(0.205 0 0)',
      'popover-foreground': 'oklch(0.985 0 0)',
      'primary': 'oklch(0.922 0 0)',
      'primary-foreground': 'oklch(0.205 0 0)',
      'secondary': 'oklch(0.269 0 0)',
      'secondary-foreground': 'oklch(0.985 0 0)',
      'muted': 'oklch(0.269 0 0)',
      'muted-foreground': 'oklch(0.708 0 0)',
      'accent': 'oklch(0.269 0 0)',
      'accent-foreground': 'oklch(0.985 0 0)',
      'destructive': 'oklch(0.704 0.191 22.216)',
      'destructive-foreground': 'oklch(0.985 0 0)',
      'border': 'oklch(1 0 0 / 10%)',
      'input': 'oklch(1 0 0 / 15%)',
      'ring': 'oklch(0.556 0 0)',
      'sidebar-background': 'oklch(0.205 0 0)',
      'sidebar-foreground': 'oklch(0.985 0 0)',
      'sidebar-primary': 'oklch(0.488 0.243 264.376)',
      'sidebar-primary-foreground': 'oklch(0.985 0 0)',
      'sidebar-accent': 'oklch(0.269 0 0)',
      'sidebar-accent-foreground': 'oklch(0.985 0 0)',
      'sidebar-border': 'oklch(1 0 0 / 10%)',
      'sidebar-ring': 'oklch(0.556 0 0)',
      'chart-1': 'oklch(0.87 0 0)',
      'chart-2': 'oklch(0.556 0 0)',
      'chart-3': 'oklch(0.439 0 0)',
      'chart-4': 'oklch(0.371 0 0)',
      'chart-5': 'oklch(0.269 0 0)',
    },
  },

  // ─── Nord ───
  {
    id: 'nord',
    name: '极光',
    description: 'Nord 北极配色，冷色调优雅',
    isDark: true,
    colors: {
      'background': 'oklch(0.22 0.03 260)',
      'foreground': 'oklch(0.93 0.01 260)',
      'card': 'oklch(0.27 0.03 260)',
      'card-foreground': 'oklch(0.93 0.01 260)',
      'popover': 'oklch(0.27 0.03 260)',
      'popover-foreground': 'oklch(0.93 0.01 260)',
      'primary': 'oklch(0.65 0.13 250)',
      'primary-foreground': 'oklch(0.22 0.03 260)',
      'secondary': 'oklch(0.32 0.03 260)',
      'secondary-foreground': 'oklch(0.93 0.01 260)',
      'muted': 'oklch(0.32 0.03 260)',
      'muted-foreground': 'oklch(0.7 0.02 260)',
      'accent': 'oklch(0.32 0.03 260)',
      'accent-foreground': 'oklch(0.93 0.01 260)',
      'destructive': 'oklch(0.65 0.18 25)',
      'destructive-foreground': 'oklch(0.93 0.01 260)',
      'border': 'oklch(0.37 0.03 260)',
      'input': 'oklch(0.37 0.03 260)',
      'ring': 'oklch(0.65 0.13 250)',
      'sidebar-background': 'oklch(0.25 0.03 260)',
      'sidebar-foreground': 'oklch(0.93 0.01 260)',
      'sidebar-primary': 'oklch(0.65 0.13 250)',
      'sidebar-primary-foreground': 'oklch(0.22 0.03 260)',
      'sidebar-accent': 'oklch(0.32 0.03 260)',
      'sidebar-accent-foreground': 'oklch(0.93 0.01 260)',
      'sidebar-border': 'oklch(0.37 0.03 260)',
      'sidebar-ring': 'oklch(0.65 0.13 250)',
      'chart-1': 'oklch(0.65 0.13 250)',
      'chart-2': 'oklch(0.6 0.12 180)',
      'chart-3': 'oklch(0.7 0.1 150)',
      'chart-4': 'oklch(0.65 0.15 80)',
      'chart-5': 'oklch(0.6 0.18 330)',
    },
  },

  // ─── Dracula ───
  {
    id: 'dracula',
    name: '德古拉',
    description: 'Dracula 暗紫色主题，鲜艳活力',
    isDark: true,
    colors: {
      'background': 'oklch(0.22 0.04 290)',
      'foreground': 'oklch(0.95 0.01 290)',
      'card': 'oklch(0.28 0.04 290)',
      'card-foreground': 'oklch(0.95 0.01 290)',
      'popover': 'oklch(0.28 0.04 290)',
      'popover-foreground': 'oklch(0.95 0.01 290)',
      'primary': 'oklch(0.68 0.17 310)',
      'primary-foreground': 'oklch(0.22 0.04 290)',
      'secondary': 'oklch(0.35 0.04 290)',
      'secondary-foreground': 'oklch(0.95 0.01 290)',
      'muted': 'oklch(0.35 0.04 290)',
      'muted-foreground': 'oklch(0.7 0.03 290)',
      'accent': 'oklch(0.35 0.04 290)',
      'accent-foreground': 'oklch(0.95 0.01 290)',
      'destructive': 'oklch(0.65 0.22 25)',
      'destructive-foreground': 'oklch(0.95 0.01 290)',
      'border': 'oklch(0.42 0.04 290)',
      'input': 'oklch(0.42 0.04 290)',
      'ring': 'oklch(0.68 0.17 310)',
      'sidebar-background': 'oklch(0.25 0.04 290)',
      'sidebar-foreground': 'oklch(0.95 0.01 290)',
      'sidebar-primary': 'oklch(0.68 0.17 310)',
      'sidebar-primary-foreground': 'oklch(0.22 0.04 290)',
      'sidebar-accent': 'oklch(0.35 0.04 290)',
      'sidebar-accent-foreground': 'oklch(0.95 0.01 290)',
      'sidebar-border': 'oklch(0.42 0.04 290)',
      'sidebar-ring': 'oklch(0.68 0.17 310)',
      'chart-1': 'oklch(0.68 0.17 310)',
      'chart-2': 'oklch(0.7 0.16 160)',
      'chart-3': 'oklch(0.75 0.14 100)',
      'chart-4': 'oklch(0.65 0.2 40)',
      'chart-5': 'oklch(0.6 0.16 220)',
    },
  },

  // ─── Solarized Light ───
  {
    id: 'solarized',
    name: '日光',
    description: 'Solarized 暖色配色，科学护眼',
    isDark: false,
    colors: {
      'background': 'oklch(0.97 0.01 80)',
      'foreground': 'oklch(0.35 0.04 60)',
      'card': 'oklch(0.99 0.005 80)',
      'card-foreground': 'oklch(0.35 0.04 60)',
      'popover': 'oklch(0.99 0.005 80)',
      'popover-foreground': 'oklch(0.35 0.04 60)',
      'primary': 'oklch(0.55 0.15 240)',
      'primary-foreground': 'oklch(0.99 0.005 80)',
      'secondary': 'oklch(0.92 0.01 80)',
      'secondary-foreground': 'oklch(0.35 0.04 60)',
      'muted': 'oklch(0.92 0.01 80)',
      'muted-foreground': 'oklch(0.55 0.03 60)',
      'accent': 'oklch(0.92 0.01 80)',
      'accent-foreground': 'oklch(0.35 0.04 60)',
      'destructive': 'oklch(0.55 0.2 25)',
      'destructive-foreground': 'oklch(0.99 0.005 80)',
      'border': 'oklch(0.88 0.015 80)',
      'input': 'oklch(0.88 0.015 80)',
      'ring': 'oklch(0.55 0.15 240)',
      'sidebar-background': 'oklch(0.95 0.012 80)',
      'sidebar-foreground': 'oklch(0.35 0.04 60)',
      'sidebar-primary': 'oklch(0.55 0.15 240)',
      'sidebar-primary-foreground': 'oklch(0.99 0.005 80)',
      'sidebar-accent': 'oklch(0.92 0.01 80)',
      'sidebar-accent-foreground': 'oklch(0.35 0.04 60)',
      'sidebar-border': 'oklch(0.88 0.015 80)',
      'sidebar-ring': 'oklch(0.55 0.15 240)',
      'chart-1': 'oklch(0.55 0.15 240)',
      'chart-2': 'oklch(0.6 0.12 160)',
      'chart-3': 'oklch(0.7 0.1 100)',
      'chart-4': 'oklch(0.6 0.15 40)',
      'chart-5': 'oklch(0.55 0.15 310)',
    },
  },
];

export function getThemeById(id: string): Theme | undefined {
  return themes.find(t => t.id === id);
}

/**
 * Apply a theme's CSS variables to a target element.
 */
export function applyThemeToElement(theme: Theme, element: HTMLElement): void {
  for (const [key, value] of Object.entries(theme.colors)) {
    const varName = `--${getCssVarName(key)}`;
    element.style.setProperty(varName, value);
  }
}

export { cssVarKeys, getCssVarName };
