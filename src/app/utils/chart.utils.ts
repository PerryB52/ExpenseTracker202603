import {
  CategorySummary,
  Expense,
  GroupingType,
  HistoryBarItem,
  PeriodGroup,
  PieChartData,
  PieLegendItem,
  PieSliceLabel,
  PieSlicePath
} from '../models/expense.model';
import { formatLocal, getMonday, parseLocal } from './date.utils';

const TOP_CATEGORY_COLORS = [
  '#ff6b6b', // 1st: red
  '#ff9f43', // 2nd: orange
  '#ffc048', // 3rd: light orange
  '#f9ca24', // 4th: darker yellow
  '#f6e58d', // 5th: lighter yellow
  '#2ecc71', // 6th: green
  '#badc58', // 7th: light green
];

const FALLBACK_PALETTE = [
  '#00d2d3', '#54a0ff', '#5f27cd', '#c8d6e5', '#ff9ff3', '#0abde3'
];

export function getCategoryColor(index: number): string {
  return index < TOP_CATEGORY_COLORS.length
    ? TOP_CATEGORY_COLORS[index]
    : FALLBACK_PALETTE[(index - TOP_CATEGORY_COLORS.length) % FALLBACK_PALETTE.length];
}

export function splitCategoryLabel(category: string): string[] {
  if (!category) return ['Uncategorized'];
  let trimmed = category.trim();

  if (trimmed.length <= 10) {
    return [trimmed];
  }

  if (trimmed.includes('/') && !trimmed.includes(' ')) {
    trimmed = trimmed.replace('/', '/ ');
  } else if (trimmed.includes('&') && !trimmed.includes(' ')) {
    trimmed = trimmed.replace('&', ' & ');
  }

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    let bestSplit = 1;
    let minDiff = Infinity;

    for (let i = 1; i < words.length; i++) {
      const line1 = words.slice(0, i).join(' ');
      const line2 = words.slice(i).join(' ');
      const diff = Math.abs(line1.length - line2.length);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplit = i;
      }
    }

    let l1 = words.slice(0, bestSplit).join(' ');
    let l2 = words.slice(bestSplit).join(' ');

    if (l1.length > 14) l1 = l1.substring(0, 13) + '…';
    if (l2.length > 14) l2 = l2.substring(0, 13) + '…';

    return [l1, l2];
  }

  if (trimmed.length <= 14) {
    return [trimmed];
  }

  const splitIdx = Math.ceil(trimmed.length / 2);
  return [trimmed.substring(0, splitIdx) + '-', trimmed.substring(splitIdx)];
}

export function groupExpensesByPeriod(expenses: Expense[], type: GroupingType): PeriodGroup[] {
  const groups: Record<string, { total: number; categoriesMap: Record<string, number> }> = {};

  for (const e of expenses) {
    const d = parseLocal(e.date);
    let key = '';

    switch (type) {
      case 'week': {
        const dayOfWeek = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(monday.getDate() - dayOfWeek + 1);
        key = `Week of ${formatLocal(monday)}`;
        break;
      }
      case 'month':
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'year':
        key = `${d.getFullYear()}`;
        break;
    }

    if (!groups[key]) {
      groups[key] = { total: 0, categoriesMap: {} };
    }

    groups[key].total += e.amount;
    const cat = e.category || 'Uncategorized';
    groups[key].categoriesMap[cat] = (groups[key].categoriesMap[cat] || 0) + e.amount;
  }

  const entries: PeriodGroup[] = Object.keys(groups).map(k => {
    const groupTotal = groups[k].total;
    const categories: CategorySummary[] = Object.keys(groups[k].categoriesMap)
      .map(c => {
        const amount = groups[k].categoriesMap[c];
        const percent = Math.round((amount / groupTotal) * 100);
        return { category: c, amount, percent };
      })
      .sort((a, b) => b.amount - a.amount);

    return { label: k, total: groupTotal, categories };
  });

  return entries.sort((a, b) => b.label.localeCompare(a.label));
}

export function buildHistoryChartData(
  allExpenses: Expense[],
  type: GroupingType,
  selectedYear: number,
  selectedMonth: string,
  selectedWeekStart: string
): HistoryBarItem[] {
  const periods: string[] = [];

  if (type === 'year') {
    for (let i = 5; i >= 0; i--) {
      periods.push((selectedYear - i).toString());
    }
  } else if (type === 'month') {
    const [y, mStr] = selectedMonth.split('-');
    const year = parseInt(y, 10);
    const month = parseInt(mStr, 10);
    for (let i = 5; i >= 0; i--) {
      let curM = month - i;
      let curY = year;
      while (curM <= 0) {
        curM += 12;
        curY -= 1;
      }
      periods.push(`${curY}-${curM.toString().padStart(2, '0')}`);
    }
  } else if (type === 'week') {
    const selected = parseLocal(selectedWeekStart);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selected);
      d.setDate(d.getDate() - i * 7);
      periods.push(formatLocal(d));
    }
  }

  const groups: Record<string, number> = {};
  for (const p of periods) {
    groups[p] = 0;
  }

  for (const e of allExpenses) {
    const d = parseLocal(e.date);
    let key = '';
    if (type === 'year') {
      key = d.getFullYear().toString();
    } else if (type === 'month') {
      key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    } else if (type === 'week') {
      key = formatLocal(getMonday(d));
    }

    if (groups[key] !== undefined) {
      groups[key] += e.amount;
    }
  }

  return periods.map(p => ({ label: p, total: groups[p] }));
}

export function buildPieChartData(groups: PeriodGroup[]): PieChartData {
  if (groups.length === 0 || groups[0].total === 0) {
    return { paths: [], labels: [], legend: [] };
  }

  const categories = groups[0].categories;
  const total = groups[0].total;

  const legend: PieLegendItem[] = [];
  const paths: PieSlicePath[] = [];
  const labels: PieSliceLabel[] = [];

  let currentAngle = 0;
  const R = 0.88;

  categories.forEach((cat, i) => {
    const fraction = cat.amount / total;
    const color = getCategoryColor(i);

    const angle = fraction * Math.PI * 2;
    const startAngle = currentAngle - Math.PI / 2;
    const endAngle = currentAngle + angle - Math.PI / 2;

    const startX = Math.cos(startAngle) * R;
    const startY = Math.sin(startAngle) * R;
    const endX = Math.cos(endAngle) * R;
    const endY = Math.sin(endAngle) * R;

    const largeArcFlag = fraction > 0.5 ? 1 : 0;

    const pathData =
      fraction >= 0.9999
        ? `M -${R} 0 A ${R} ${R} 0 1 1 ${R} 0 A ${R} ${R} 0 1 1 -${R} 0 Z`
        : [`M 0 0`, `L ${startX} ${startY}`, `A ${R} ${R} 0 ${largeArcFlag} 1 ${endX} ${endY}`, `Z`].join(' ');

    paths.push({ path: pathData, color });

    if (fraction >= 0.04) {
      const midAngle = currentAngle + angle / 2 - Math.PI / 2;

      const lineStartX = Math.cos(midAngle) * (R * 0.96);
      const lineStartY = Math.sin(midAngle) * (R * 0.96);

      const lineOuterX = Math.cos(midAngle) * (R * 1.18);
      const lineOuterY = Math.sin(midAngle) * (R * 1.18);

      const isRight = Math.cos(midAngle) >= 0;
      const lineEndX = lineOuterX + (isRight ? 0.12 : -0.12);
      const textX = lineEndX + (isRight ? 0.04 : -0.04);
      const lines = splitCategoryLabel(cat.category);

      labels.push({
        linePath: `M ${lineStartX} ${lineStartY} L ${lineOuterX} ${lineOuterY} L ${lineEndX} ${lineOuterY}`,
        color,
        textX,
        categoryY1: lines.length === 2 ? lineOuterY - 0.15 : lineOuterY - 0.03,
        categoryY2: lines.length === 2 ? lineOuterY - 0.03 : null,
        percentY: lineOuterY + 0.13,
        anchor: isRight ? 'start' : 'end',
        lines,
        percent: (fraction * 100).toFixed(1) + ' %'
      });
    }

    legend.push({
      name: cat.category,
      percent: fraction * 100,
      amount: cat.amount,
      color
    });

    currentAngle += angle;
  });

  return { paths, labels, legend };
}

