export interface Expense {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
  currency: string;
}

export interface Category {
  name: string;
  subcategories: string[];
}

export type ThemeId = 'light' | 'dark' | 'ocean-dark' | 'emerald-light';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  isDark: boolean;
  preview: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
  };
}

export interface ExpenseFormModel {
  amount: number | null;
  category: string;
  subcategory: string;
  description: string;
  date: string;
  currency: string;
}

export type GroupingType = 'week' | 'month' | 'year';
export type ChartType = 'bar' | 'pie';

export interface CategorySummary {
  category: string;
  amount: number;
  percent: number;
}

export interface PeriodGroup {
  label: string;
  total: number;
  categories: CategorySummary[];
}

export interface HistoryBarItem {
  label: string;
  total: number;
}

export interface PieSlicePath {
  path: string;
  color: string;
}

export interface PieSliceLabel {
  linePath: string;
  color: string;
  textX: number;
  categoryY1: number;
  categoryY2: number | null;
  percentY: number;
  anchor: 'start' | 'end';
  lines: string[];
  percent: string;
}

export interface PieLegendItem {
  name: string;
  percent: number;
  amount: number;
  color: string;
}

export interface PieChartData {
  paths: PieSlicePath[];
  labels: PieSliceLabel[];
  legend: PieLegendItem[];
}
