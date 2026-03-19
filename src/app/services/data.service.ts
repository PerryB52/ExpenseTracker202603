import { Injectable, signal } from '@angular/core';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  date: string;
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

  private categoriesSignal = signal<Category[]>([
    { name: 'Food', subcategories: ['Groceries', 'Restaurants', 'Fast Food'] },
    { name: 'Transport', subcategories: ['Public Transit', 'Taxi', 'Gas'] },
    { name: 'Utilities', subcategories: ['Electricity', 'Water', 'Internet'] },
    { name: 'Entertainment', subcategories: ['Movies', 'Games', 'Subscriptions'] },
    { name: 'Shopping', subcategories: ['Clothes', 'Electronics'] },
    { name: 'Other', subcategories: [] }
  ]);
  public readonly categories = this.categoriesSignal.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      const res = await fetch('assets/data/expenses.json');
      if (res.ok) {
        const data = await res.json();
        this.expensesSignal.set(data);
      }
    } catch (err) {
      console.error('Failed to load mock data', err);
    }
  }

  addExpense(expense: Omit<Expense, 'id'>) {
    const newExpense: Expense = {
      ...expense,
      id: Math.random().toString(36).substr(2, 9),
    };
    this.expensesSignal.update(expenses => [newExpense, ...expenses]);
  }

  editExpense(id: string, updatedExpense: Omit<Expense, 'id'>) {
    this.expensesSignal.update(expenses =>
      expenses.map(e => (e.id === id ? { ...updatedExpense, id } : e))
    );
  }

  deleteExpense(id: string) {
    this.expensesSignal.update(expenses => expenses.filter(e => e.id !== id));
  }

  addCategory(category: string) {
    const trimmed = category.trim();
    if (trimmed && !this.categoriesSignal().some(c => c.name === trimmed)) {
      this.categoriesSignal.update(cats => [...cats, { name: trimmed, subcategories: [] }]);
    }
  }

  deleteCategory(category: string) {
    this.categoriesSignal.update(cats => cats.filter(c => c.name !== category));
  }

  editCategory(oldCategory: string, newCategory: string) {
    const trimmedNew = newCategory.trim();
    if (trimmedNew && oldCategory !== trimmedNew && !this.categoriesSignal().some(c => c.name === trimmedNew)) {
      // 1. Update the categories list
      this.categoriesSignal.update(cats => 
        cats.map(c => c.name === oldCategory ? { ...c, name: trimmedNew } : c)
      );
      
      // 2. Cascade the update to any expenses that used the old category name
      this.expensesSignal.update(expenses => 
        expenses.map(e => e.category === oldCategory ? { ...e, category: trimmedNew } : e)
      );
    }
  }

  addSubcategory(parentCategory: string, subcategory: string) {
    const trimmed = subcategory.trim();
    if (trimmed) {
      this.categoriesSignal.update(cats => 
        cats.map(c => {
          if (c.name === parentCategory && !c.subcategories.includes(trimmed)) {
            return { ...c, subcategories: [...c.subcategories, trimmed] };
          }
          return c;
        })
      );
    }
  }

  deleteSubcategory(parentCategory: string, subcategory: string) {
    this.categoriesSignal.update(cats => 
      cats.map(c => {
        if (c.name === parentCategory) {
          return { ...c, subcategories: c.subcategories.filter(s => s !== subcategory) };
        }
        return c;
      })
    );
  }

  editSubcategory(parentCategory: string, oldSub: string, newSub: string) {
    const trimmedNew = newSub.trim();
    if (trimmedNew && oldSub !== trimmedNew) {
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
      
      // Cascade to expenses
      this.expensesSignal.update(expenses => 
        expenses.map(e => (e.category === parentCategory && e.subcategory === oldSub) 
          ? { ...e, subcategory: trimmedNew } : e)
      );
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
}
