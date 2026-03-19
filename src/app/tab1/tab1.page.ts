import { Component, ViewChild } from '@angular/core';
import { DataService } from '../services/data.service';
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  @ViewChild(IonModal) modal!: IonModal;

  newExpense = {
    amount: null,
    category: '',
    subcategory: '',
    description: '',
    date: new Date().toISOString()
  };

  constructor(public dataService: DataService) {}

  cancel() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    if (this.newExpense.amount && this.newExpense.category) {
      this.dataService.addExpense({
        amount: Number(this.newExpense.amount),
        category: this.newExpense.category,
        subcategory: this.newExpense.subcategory,
        description: this.newExpense.description || '',
        date: this.newExpense.date
      });
      this.modal.dismiss(this.newExpense, 'confirm');
      this.resetForm();
    }
  }

  resetForm() {
    this.newExpense = { amount: null, category: '', subcategory: '', description: '', date: new Date().toISOString() };
  }

  onCategoryChange() {
    this.newExpense.subcategory = '';
  }

  getSubcategories(): string[] {
    const cat = this.dataService.categories().find(c => c.name === this.newExpense.category);
    return cat ? cat.subcategories : [];
  }

  deleteExpense(id: string) {
    this.dataService.deleteExpense(id);
  }
}

