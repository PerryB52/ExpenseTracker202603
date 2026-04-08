import { Injectable, signal, computed } from '@angular/core';
import { DatabaseService } from './database.service';

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

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private expensesSignal = signal<Expense[]>([]);
  public readonly expenses = this.expensesSignal.asReadonly();

  private categoriesSignal = signal<Category[]>([]);
  public readonly categories = this.categoriesSignal.asReadonly();

  public activeCurrencySignal = signal<string>('USD');
  public readonly activeCurrency = this.activeCurrencySignal.asReadonly();
  
  public activeCurrencySymbol = computed(() => {
    const code = this.activeCurrencySignal();
    const map: any = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': '$' };
    return map[code] || code;
  });

  constructor(private dbService: DatabaseService) {
    this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      const db = this.dbService.getDb();
      if (!db) return;

      // Load expenses
      const expensesRes = await db.query('SELECT * FROM expenses ORDER BY date DESC;');
      const expenses = expensesRes.values || [];
      this.expensesSignal.set(expenses as Expense[]);

      // Load categories
      const categoriesRes = await db.query('SELECT name FROM categories;');
      const loadedCategories: Category[] = [];
      if (categoriesRes.values) {
        for (const catRow of categoriesRes.values) {
          const subRes = await db.query('SELECT name FROM subcategories WHERE parent_category = ?', [catRow.name]);
          const subcategories = subRes.values ? subRes.values.map(s => s.name) : [];
          loadedCategories.push({ name: catRow.name, subcategories });
        }
      }
      this.categoriesSignal.set(loadedCategories);
      
      const settingsRes = await db.query('SELECT value FROM settings WHERE key = ?', ['active_currency']);
      if (settingsRes.values && settingsRes.values.length > 0) {
        this.activeCurrencySignal.set(settingsRes.values[0].value);
      }
    } catch (err) {
      console.error('Failed to load data from SQLite', err);
    }
  }

  async setActiveCurrency(currency: string) {
    try {
      const db = this.dbService.getDb();
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['active_currency', currency]);
      this.dbService.saveStore();
      this.activeCurrencySignal.set(currency);
    } catch (e) {
      console.error(e);
    }
  }

  async addExpense(expense: Omit<Expense, 'id' | 'currency'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const currency = this.activeCurrencySignal();
    const newExpense: Expense = { ...expense, id, currency };
    
    try {
      const db = this.dbService.getDb();
      await db.run(
        'INSERT INTO expenses (id, amount, category, subcategory, description, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newExpense.id, newExpense.amount, newExpense.category, newExpense.subcategory || null, newExpense.description, newExpense.date, newExpense.currency]
      );
      this.dbService.saveStore();
      this.expensesSignal.update(expenses => [newExpense, ...expenses]);
    } catch (e) {
      console.error(e);
    }
  }

  async editExpense(id: string, updatedExpense: Omit<Expense, 'id'>) {
    try {
      const db = this.dbService.getDb();
      await db.run(
        'UPDATE expenses SET amount = ?, category = ?, subcategory = ?, description = ?, date = ?, currency = ? WHERE id = ?',
        [updatedExpense.amount, updatedExpense.category, updatedExpense.subcategory || null, updatedExpense.description, updatedExpense.date, updatedExpense.currency, id]
      );
      this.dbService.saveStore();
      this.expensesSignal.update(expenses =>
        expenses.map(e => (e.id === id ? { ...updatedExpense, id } : e))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async deleteExpense(id: string) {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM expenses WHERE id = ?', [id]);
      this.dbService.saveStore();
      this.expensesSignal.update(expenses => expenses.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async addCategory(category: string) {
    const trimmed = category.trim();
    if (trimmed && !this.categoriesSignal().some(c => c.name === trimmed)) {
      try {
        const db = this.dbService.getDb();
        await db.run('INSERT INTO categories (name) VALUES (?)', [trimmed]);
        this.dbService.saveStore();
        this.categoriesSignal.update(cats => [...cats, { name: trimmed, subcategories: [] }]);
      } catch (e) {
        console.error(e);
      }
    }
  }

  async deleteCategory(category: string) {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM categories WHERE name = ?', [category]);
      this.dbService.saveStore();
      this.categoriesSignal.update(cats => cats.filter(c => c.name !== category));
    } catch (e) {
      console.error(e);
    }
  }

  async editCategory(oldCategory: string, newCategory: string) {
    const trimmedNew = newCategory.trim();
    if (trimmedNew && oldCategory !== trimmedNew && !this.categoriesSignal().some(c => c.name === trimmedNew)) {
      try {
        const db = this.dbService.getDb();
        await db.run('UPDATE categories SET name = ? WHERE name = ?', [trimmedNew, oldCategory]);
        await db.run('UPDATE subcategories SET parent_category = ? WHERE parent_category = ?', [trimmedNew, oldCategory]);
        await db.run('UPDATE expenses SET category = ? WHERE category = ?', [trimmedNew, oldCategory]);
        this.dbService.saveStore();

        this.categoriesSignal.update(cats => 
          cats.map(c => c.name === oldCategory ? { ...c, name: trimmedNew } : c)
        );
        this.expensesSignal.update(expenses => 
          expenses.map(e => e.category === oldCategory ? { ...e, category: trimmedNew } : e)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  async addSubcategory(parentCategory: string, subcategory: string) {
    const trimmed = subcategory.trim();
    if (trimmed) {
      try {
        const db = this.dbService.getDb();
        await db.run('INSERT INTO subcategories (parent_category, name) VALUES (?, ?)', [parentCategory, trimmed]);
        this.dbService.saveStore();

        this.categoriesSignal.update(cats => 
          cats.map(c => {
            if (c.name === parentCategory && !c.subcategories.includes(trimmed)) {
              return { ...c, subcategories: [...c.subcategories, trimmed] };
            }
            return c;
          })
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  async deleteSubcategory(parentCategory: string, subcategory: string) {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM subcategories WHERE parent_category = ? AND name = ?', [parentCategory, subcategory]);
      this.dbService.saveStore();

      this.categoriesSignal.update(cats => 
        cats.map(c => {
          if (c.name === parentCategory) {
            return { ...c, subcategories: c.subcategories.filter(s => s !== subcategory) };
          }
          return c;
        })
      );
    } catch (e) {
      console.error(e);
    }
  }

  async editSubcategory(parentCategory: string, oldSub: string, newSub: string) {
    const trimmedNew = newSub.trim();
    if (trimmedNew && oldSub !== trimmedNew) {
      try {
        const db = this.dbService.getDb();
        await db.run('UPDATE subcategories SET name = ? WHERE parent_category = ? AND name = ?', [trimmedNew, parentCategory, oldSub]);
        await db.run('UPDATE expenses SET subcategory = ? WHERE category = ? AND subcategory = ?', [trimmedNew, parentCategory, oldSub]);
        this.dbService.saveStore();

        this.categoriesSignal.update(cats => 
          cats.map(c => {
            if (c.name === parentCategory && !c.subcategories.includes(trimmedNew)) {
              return {
                ...c,
                subcategories: c.subcategories.map(s => s === oldSub ? trimmedNew : s)
              };
            }
            return c;
          })
        );
        this.expensesSignal.update(expenses => 
          expenses.map(e => (e.category === parentCategory && e.subcategory === oldSub) 
            ? { ...e, subcategory: trimmedNew } : e)
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  getStats() {
    const currentExpenses = this.expensesSignal();
    const total = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = currentExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, byCategory };
  }

  async exportToCSV() {
    const expenses = this.expensesSignal();
    let csvStr = "id,amount,category,subcategory,description,date\n";
    
    for (const e of expenses) {
      const id = e.id;
      const amount = e.amount.toString();
      const cat = `"${e.category.replace(/"/g, '""')}"`;
      const sub = `"${(e.subcategory || '').replace(/"/g, '""')}"`;
      const desc = `"${e.description.replace(/"/g, '""')}"`;
      const date = e.date;
      const curr = e.currency || 'USD';
      csvStr += `${id},${amount},${cat},${sub},${desc},${date},${curr}\n`;
    }

    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_tracker_backup_${new Date().toISOString().substring(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async importFromCSV(file: File) {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length <= 1) return; 
      
      const parsedExpenses: Expense[] = [];
      const distinctCats = new Set<string>();
      const distinctSubs = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        let row = [];
        let inQuotes = false;
        let buf = '';
        for(let j=0; j<line.length; j++) {
            const char = line[j];
            if(char === '"' && line[j+1] === '"') {
                buf += '"'; j++;
            } else if(char === '"') {
                inQuotes = !inQuotes;
            } else if(char === ',' && !inQuotes) {
                row.push(buf); buf = '';
            } else {
                buf += char;
            }
        }
        row.push(buf);

        if (row.length >= 6) {
          const id = row[0] || Math.random().toString(36).substr(2, 9);
          const amount = parseFloat(row[1]) || 0;
          const category = row[2];
          const subcategory = row[3];
          const description = row[4];
          const date = row[5];
          const currency = row[6] || this.activeCurrencySignal();
          
          parsedExpenses.push({ id, amount, category, subcategory, description, date, currency });
          if (category) distinctCats.add(category);
          if (category && subcategory) distinctSubs.add(`${category}|${subcategory}`);
        }
      }

      const db = this.dbService.getDb();
      await db.run('DELETE FROM expenses');
      await db.run('DELETE FROM subcategories');
      await db.run('DELETE FROM categories');

      for (const cat of distinctCats) {
        await db.run('INSERT INTO categories (name) VALUES (?)', [cat]);
      }
      for (const parentSub of distinctSubs) {
        const [p, s] = parentSub.split('|');
        await db.run('INSERT INTO subcategories (parent_category, name) VALUES (?, ?)', [p, s]);
      }

      const expenseValues = parsedExpenses.map(e => [e.id, e.amount, e.category, e.subcategory || null, e.description, e.date, e.currency]);
      
      if (expenseValues.length > 0) {
        await db.executeSet([{
          statement: 'INSERT INTO expenses (id, amount, category, subcategory, description, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
          values: expenseValues
        }]);
      }
      
      this.dbService.saveStore();
      await this.loadInitialData();
      
    } catch (e) {
      console.error('Failed to parse or import CSV', e);
    }
  }
}
