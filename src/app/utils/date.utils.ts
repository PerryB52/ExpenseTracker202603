export const MONTH_NAMES: readonly string[] = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

export function parseLocal(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.substring(0, 10).split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

export function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-');
  let y = parseInt(year, 10);
  let m = parseInt(month, 10) + delta;

  while (m <= 0) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }

  return `${y}-${m.toString().padStart(2, '0')}`;
}

export function formatMonth(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
}

export function formatWeek(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseLocal(dateStr);
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() + 6);

  const startMonth = (d.getMonth() + 1).toString().padStart(2, '0');
  const startDate = d.getDate().toString().padStart(2, '0');
  const endMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
  const endDate = sunday.getDate().toString().padStart(2, '0');

  return `${startMonth}/${startDate} - ${endMonth}/${endDate}`;
}

