import { Injectable, signal, computed } from '@angular/core';
import { DatabaseService } from './database.service';
import { Expense, Category } from '../models/expense.model';
import { getCurrencySymbol } from '../utils/currency.utils';
import { generateSecureId } from '../utils/id.utils';

export { Expense, Category } from '../models/expense.model';

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

  public selectedExpenseMonth = signal<string>(new Date().toISOString().substring(0, 7));
  public lastActiveTab = 'tab1';

  public activeCurrencySymbol = computed(() => getCurrencySymbol(this.activeCurrencySignal()));

  constructor(private dbService: DatabaseService) {
    this.loadInitialData();
  }

  public async loadInitialData(): Promise<void> {
    try {
      const db = this.dbService.getDb();
      if (!db) return;

      const expensesRes = await db.query('SELECT * FROM expenses ORDER BY date DESC;');
      const expenses = expensesRes.values || [];
      this.expensesSignal.set(expenses as Expense[]);

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

  async setActiveCurrency(currency: string): Promise<void> {
    try {
      const db = this.dbService.getDb();
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['active_currency', currency]);
      this.dbService.saveStore();
      this.activeCurrencySignal.set(currency);
    } catch (e) {
      console.error(e);
    }
  }

  async addExpense(expense: Omit<Expense, 'id' | 'currency'>): Promise<void> {
    const id = generateSecureId();
    const currency = this.activeCurrencySignal();
    const newExpense: Expense = { ...expense, id, currency };

    try {
      const db = this.dbService.getDb();
      await db.run(
        'INSERT INTO expenses (id, amount, category, subcategory, description, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          newExpense.id,
          newExpense.amount,
          newExpense.category,
          newExpense.subcategory || null,
          newExpense.description,
          newExpense.date,
          newExpense.currency,
        ]
      );
      this.dbService.saveStore();
      this.expensesSignal.update(expenses => [newExpense, ...expenses]);
    } catch (e) {
      console.error(e);
    }
  }

  async editExpense(id: string, updatedExpense: Omit<Expense, 'id'>): Promise<void> {
    try {
      const db = this.dbService.getDb();
      await db.run(
        'UPDATE expenses SET amount = ?, category = ?, subcategory = ?, description = ?, date = ?, currency = ? WHERE id = ?',
        [
          updatedExpense.amount,
          updatedExpense.category,
          updatedExpense.subcategory || null,
          updatedExpense.description,
          updatedExpense.date,
          updatedExpense.currency,
          id,
        ]
      );
      this.dbService.saveStore();
      this.expensesSignal.update(expenses =>
        expenses.map(e => (e.id === id ? { ...updatedExpense, id } : e))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM expenses WHERE id = ?', [id]);
      this.dbService.saveStore();
      this.expensesSignal.update(expenses => expenses.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async addCategory(category: string): Promise<void> {
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

  async deleteCategory(category: string): Promise<void> {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM categories WHERE name = ?', [category]);
      this.dbService.saveStore();
      this.categoriesSignal.update(cats => cats.filter(c => c.name !== category));
    } catch (e) {
      console.error(e);
    }
  }

  async editCategory(oldCategory: string, newCategory: string): Promise<void> {
    const trimmedNew = newCategory.trim();
    if (trimmedNew && oldCategory !== trimmedNew && !this.categoriesSignal().some(c => c.name === trimmedNew)) {
      try {
        const db = this.dbService.getDb();
        await db.run('INSERT INTO categories (name) VALUES (?)', [trimmedNew]);
        await db.run('UPDATE subcategories SET parent_category = ? WHERE parent_category = ?', [trimmedNew, oldCategory]);
        await db.run('UPDATE expenses SET category = ? WHERE category = ?', [trimmedNew, oldCategory]);
        await db.run('DELETE FROM categories WHERE name = ?', [oldCategory]);
        this.dbService.saveStore();

        this.categoriesSignal.update(cats =>
          cats.map(c => (c.name === oldCategory ? { ...c, name: trimmedNew } : c))
        );
        this.expensesSignal.update(expenses =>
          expenses.map(e => (e.category === oldCategory ? { ...e, category: trimmedNew } : e))
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  async addSubcategory(parentCategory: string, subcategory: string): Promise<void> {
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

  async deleteSubcategory(parentCategory: string, subcategory: string): Promise<void> {
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

  async editSubcategory(parentCategory: string, oldSub: string, newSub: string): Promise<void> {
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
                subcategories: c.subcategories.map(s => (s === oldSub ? trimmedNew : s)),
              };
            }
            return c;
          })
        );
        this.expensesSignal.update(expenses =>
          expenses.map(e =>
            e.category === parentCategory && e.subcategory === oldSub
              ? { ...e, subcategory: trimmedNew }
              : e
          )
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  getStats(): { total: number; byCategory: Record<string, number> } {
    const currentExpenses = this.expensesSignal();
    const total = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = currentExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    return { total, byCategory };
  }

  /**
   * Replaces all categories, subcategories, and expenses in SQLite and reloads reactive state.
   */
  async replaceAllData(
    expenses: Expense[],
    distinctCategories: Set<string>,
    distinctSubcategories: Set<string>
  ): Promise<void> {
    const db = this.dbService.getDb();
    await db.run('DELETE FROM expenses');
    await db.run('DELETE FROM subcategories');
    await db.run('DELETE FROM categories');

    for (const cat of distinctCategories) {
      await db.run('INSERT INTO categories (name) VALUES (?)', [cat]);
    }
    for (const parentSub of distinctSubcategories) {
      const [parent, sub] = parentSub.split('|');
      await db.run('INSERT INTO subcategories (parent_category, name) VALUES (?, ?)', [parent, sub]);
    }

    const expenseValues = expenses.map(e => [
      e.id,
      e.amount,
      e.category,
      e.subcategory || null,
      e.description,
      e.date,
      e.currency,
    ]);

    if (expenseValues.length > 0) {
      await db.executeSet([
        {
          statement:
            'INSERT INTO expenses (id, amount, category, subcategory, description, date, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
          values: expenseValues,
        },
      ]);
    }

    this.dbService.saveStore();
    await this.loadInitialData();
  }

  async clearAllData(): Promise<void> {
    try {
      const db = this.dbService.getDb();
      await db.run('DELETE FROM expenses');
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['seed_version', 'cleared']);

      this.dbService.saveStore();
      this.expensesSignal.set([]);
    } catch (e) {
      console.error(e);
    }
  }
}
