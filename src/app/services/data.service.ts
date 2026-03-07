import { Injectable, signal } from '@angular/core';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private expensesSignal = signal<Expense[]>([]);
  public readonly expenses = this.expensesSignal.asReadonly();

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

  deleteExpense(id: string) {
    this.expensesSignal.update(expenses => expenses.filter(e => e.id !== id));
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
