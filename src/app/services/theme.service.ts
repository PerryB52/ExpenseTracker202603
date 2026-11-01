import { Injectable, computed, signal } from '@angular/core';
import { DatabaseService } from './database.service';
import { ThemeDefinition, ThemeId } from '../models/expense.model';

const THEME_STORAGE_KEY = 'expensetracker_active_theme';

export const AVAILABLE_THEMES: readonly ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Classic Light',
    description: 'Clean light appearance with frosted glass cards',
    isDark: false,
    preview: {
      background: '#f6f8fc',
      surface: '#ffffff',
      primary: '#4a90e2',
      accent: '#fa048b',
    },
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    description: 'Deep charcoal dark mode with soft contrast and subtle borders',
    isDark: true,
    preview: {
      background: '#121418',
      surface: '#1e2229',
      primary: '#014f75',
      accent: '#ff4c8b',
    },
  },
  {
    id: 'ocean-dark',
    name: 'Ocean Dark',
    description: 'Deep navy night theme with vibrant cyan and azure highlights',
    isDark: true,
    preview: {
      background: '#0b132b',
      surface: '#1c2541',
      primary: '#00b4d8',
      accent: '#48cae4',
    },
  },
  {
    id: 'emerald-light',
    name: 'Emerald Light',
    description: 'Fresh sage background with emerald and teal accents',
    isDark: false,
    preview: {
      background: '#f1f8f5',
      surface: '#ffffff',
      primary: '#0d9488',
      accent: '#10b981',
    },
  },
];

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly themes = AVAILABLE_THEMES;

  private activeThemeIdSignal = signal<ThemeId>('light');
  readonly activeThemeId = this.activeThemeIdSignal.asReadonly();

  readonly activeTheme = computed<ThemeDefinition>(() => {
    const id = this.activeThemeIdSignal();
    return this.themes.find(t => t.id === id) || this.themes[0];
  });

  constructor(private dbService: DatabaseService) {
    this.initTheme();
  }

  private async initTheme(): Promise<void> {
    // 1. Apply cached theme immediately to avoid startup flash
    const cached = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (cached && this.isValidTheme(cached)) {
      this.applyThemeToDom(cached);
      this.activeThemeIdSignal.set(cached);
    } else {
      this.applyThemeToDom('light');
    }

    // 2. Load authoritative setting from SQLite
    try {
      const db = this.dbService.getDb();
      if (!db) return;

      const res = await db.query('SELECT value FROM settings WHERE key = ?', ['active_theme']);
      if (res.values && res.values.length > 0) {
        const storedTheme = res.values[0].value as ThemeId;
        if (this.isValidTheme(storedTheme)) {
          this.activeThemeIdSignal.set(storedTheme);
          localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
          this.applyThemeToDom(storedTheme);
        }
      }
    } catch (e) {
      console.error('Failed to load theme from SQLite', e);
    }
  }

  async setTheme(themeId: ThemeId): Promise<void> {
    if (!this.isValidTheme(themeId)) return;

    this.activeThemeIdSignal.set(themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    this.applyThemeToDom(themeId);

    try {
      const db = this.dbService.getDb();
      if (db) {
        await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
          'active_theme',
          themeId,
        ]);
        await this.dbService.saveStore();
      }
    } catch (e) {
      console.error('Failed to persist theme to SQLite', e);
    }
  }

  private isValidTheme(id: string): id is ThemeId {
    return this.themes.some(t => t.id === id);
  }

  private applyThemeToDom(themeId: ThemeId): void {
    const theme = this.themes.find(t => t.id === themeId) || this.themes[0];
    const root = document.documentElement;

    root.setAttribute('data-theme', theme.id);
    root.classList.toggle('ion-palette-dark', theme.isDark);

    const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaColorScheme) {
      metaColorScheme.setAttribute('content', theme.isDark ? 'dark' : 'light');
    }
  }
}

