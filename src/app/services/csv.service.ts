import { Injectable } from '@angular/core';
import { Expense } from '../models/expense.model';
import { DataService } from './data.service';
import { generateSecureId } from '../utils/id.utils';

@Injectable({
  providedIn: 'root',
})
export class CsvService {
  constructor(private dataService: DataService) { }

  /**
   * Parses a single RFC-4180 CSV line, handling quoted fields and escaped double-quotes ("").
   */
  private parseCsvLine(line: string): string[] {
    const row: string[] = [];
    let inQuotes = false;
    let buf = '';

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' && line[j + 1] === '"') {
        buf += '"';
        j++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(buf);
        buf = '';
      } else {
        buf += char;
      }
    }
    row.push(buf);
    return row;
  }

  /**
   * Normalizes raw date strings (standard ISO or DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY) to ISO string.
   */
  private normalizeExternalDate(rawDate: string): string {
    const trimmed = rawDate ? rawDate.trim() : '';
    let finalDateObj = new Date();

    if (trimmed) {
      const tryStandard = new Date(trimmed);
      if (!isNaN(tryStandard.getTime())) {
        finalDateObj = tryStandard;
      } else {
        const parts = trimmed.split(/[-/.]/);
        if (parts.length === 3) {
          const tryEuro = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
          if (!isNaN(tryEuro.getTime())) {
            finalDateObj = tryEuro;
          }
        }
      }
    }

    return finalDateObj.toISOString();
  }

  private escapeCsvField(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  async exportToCSV(): Promise<void> {
    const expenses = this.dataService.expenses();
    let csvStr = 'id,amount,category,subcategory,description,date,currency\n';

    for (const e of expenses) {
      const id = e.id;
      const amount = e.amount.toString();
      const cat = this.escapeCsvField(e.category);
      const sub = this.escapeCsvField(e.subcategory || '');
      const desc = this.escapeCsvField(e.description);
      const date = e.date;
      const curr = e.currency || 'USD';
      csvStr += `${id},${amount},${cat},${sub},${desc},${date},${curr}\n`;
    }

    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_tracker_backup_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async importFromCSV(file: File): Promise<void> {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return;

      const parsedExpenses: Expense[] = [];
      const distinctCats = new Set<string>();
      const distinctSubs = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvLine(lines[i]);
        if (row.length >= 6) {
          const id = row[0] || generateSecureId();
          const amount = parseFloat(row[1]) || 0;
          const category = row[2];
          const subcategory = row[3];
          const description = row[4];
          const date = row[5];
          const currency = row[6] || this.dataService.activeCurrency();

          parsedExpenses.push({ id, amount, category, subcategory, description, date, currency });
          if (category) distinctCats.add(category);
          if (category && subcategory) distinctSubs.add(`${category}|${subcategory}`);
        }
      }

      await this.dataService.replaceAllData(parsedExpenses, distinctCats, distinctSubs);
    } catch (e) {
      console.error('Failed to parse or import CSV', e);
    }
  }

  async importExternalCSV(file: File): Promise<void> {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return;

      const headers = this.parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      const indexMap = {
        amount: headers.indexOf('amount'),
        category: headers.indexOf('category'),
        subcategory: headers.indexOf('subcategory'),
        description: headers.indexOf('description'),
        date: headers.indexOf('date'),
        currency: headers.indexOf('currency'),
      };

      const parsedExpenses: Expense[] = [];
      const distinctCats = new Set<string>();
      const distinctSubs = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCsvLine(lines[i]);
        const id = generateSecureId();
        const amount = indexMap.amount >= 0 ? parseFloat(row[indexMap.amount]) || 0 : 0;
        const category = indexMap.category >= 0 ? row[indexMap.category] : '';
        const subcategory = indexMap.subcategory >= 0 ? row[indexMap.subcategory] : '';
        const description = indexMap.description >= 0 ? row[indexMap.description] : '';
        const rawDate = indexMap.date >= 0 && row[indexMap.date] ? row[indexMap.date] : '';
        const date = this.normalizeExternalDate(rawDate);
        const currency =
          indexMap.currency >= 0 && row[indexMap.currency]
            ? row[indexMap.currency]
            : this.dataService.activeCurrency();

        parsedExpenses.push({ id, amount, category, subcategory, description, date, currency });
        if (category) distinctCats.add(category);
        if (category && subcategory) distinctSubs.add(`${category}|${subcategory}`);
      }

      await this.dataService.replaceAllData(parsedExpenses, distinctCats, distinctSubs);
    } catch (e) {
      console.error('Failed to parse or import External CSV', e);
    }
  }
}

