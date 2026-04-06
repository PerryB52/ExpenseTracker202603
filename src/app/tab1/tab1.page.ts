import { Component, ViewChild, computed, signal } from '@angular/core';
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
  selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));

  newExpense: any = {
    amount: null,
    category: '',
    subcategory: '',
    description: '',
    date: new Date().toISOString()
  };

  @ViewChild('customMonthPicker') customMonthPicker!: IonModal;
  pickerYear = signal<number>(new Date().getFullYear());
  monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  openPicker() {
    this.pickerYear.set(parseInt(this.selectedMonth().substring(0, 4)));
    this.customMonthPicker.present();
  }

  changePickerYear(delta: number) {
    this.pickerYear.update(y => y + delta);
  }

  prevMonth() {
    const [year, month] = this.selectedMonth().split('-');
    let y = parseInt(year);
    let m = parseInt(month) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const monthStr = m.toString().padStart(2, '0');
    this.selectedMonth.set(`${y}-${monthStr}`);
  }

  nextMonth() {
    const [year, month] = this.selectedMonth().split('-');
    let y = parseInt(year);
    let m = parseInt(month) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    const monthStr = m.toString().padStart(2, '0');
    this.selectedMonth.set(`${y}-${monthStr}`);
  }

  isMonthSelected(index: number): boolean {
    const selYear = parseInt(this.selectedMonth().substring(0, 4));
    const selMonth = parseInt(this.selectedMonth().substring(5, 7)) - 1;
    return this.pickerYear() === selYear && index === selMonth;
  }

  selectMonth(index: number) {
    const monthStr = (index + 1).toString().padStart(2, '0');
    this.selectedMonth.set(`${this.pickerYear()}-${monthStr}`);
    this.customMonthPicker.dismiss();
  }

  selectThisMonth() {
    const now = new Date();
    this.pickerYear.set(now.getFullYear());
    const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth.set(`${this.pickerYear()}-${monthStr}`);
    this.customMonthPicker.dismiss();
  }

  formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
  }

  groupedExpenses = computed(() => {
    const monthFilter = this.selectedMonth();
    const expenses = this.dataService.expenses().filter(e => e.date && e.date.startsWith(monthFilter));
    const groups: { [dateKey: string]: { date: string, expenses: Expense[], total: number } } = {};
    
    expenses.forEach(e => {
      const dateObj = new Date(e.date);
      const dateKey = `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = { date: e.date, expenses: [], total: 0 };
      }
      groups[dateKey].expenses.push(e);
      groups[dateKey].total += e.amount;
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return sortedDates.map(date => groups[date]);
  });

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

