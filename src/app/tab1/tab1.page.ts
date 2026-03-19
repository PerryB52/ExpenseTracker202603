import { Component, ViewChild } from '@angular/core';
import { DataService, Expense } from '../services/data.service';
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  @ViewChild(IonModal) modal!: IonModal;

  editingExpenseId: string | null = null;

  newExpense: any = {
    amount: null,
    category: '',
    subcategory: '',
    description: '',
    date: new Date().toISOString()
  };

  constructor(public dataService: DataService) {}

  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.resetForm();
  }

  confirm() {
    if (this.newExpense.amount && this.newExpense.category) {
      const expenseData = {
        amount: Number(this.newExpense.amount),
        category: this.newExpense.category,
        subcategory: this.newExpense.subcategory,
        description: this.newExpense.description || '',
        date: this.newExpense.date
      };

      if (this.editingExpenseId) {
        this.dataService.editExpense(this.editingExpenseId, expenseData);
      } else {
        this.dataService.addExpense(expenseData);
      }
      
      this.modal.dismiss(this.newExpense, 'confirm');
      this.resetForm();
    }
  }

  resetForm() {
    this.editingExpenseId = null;
    this.newExpense = { amount: null, category: '', subcategory: '', description: '', date: new Date().toISOString() };
  }

  onCategoryChange() {
    this.newExpense.subcategory = '';
  }

  openEditModal(expense: Expense) {
    this.editingExpenseId = expense.id;
    this.newExpense = {
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || '',
      description: expense.description || '',
      date: expense.date
    };
    this.modal.present();
  }

  getSubcategories(): string[] {
    const cat = this.dataService.categories().find(c => c.name === this.newExpense.category);
    return cat ? cat.subcategories : [];
  }

  deleteExpense(id: string) {
    this.dataService.deleteExpense(id);
  }
}

