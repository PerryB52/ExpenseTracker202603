import { Component, ViewChild, computed } from '@angular/core';
import { IonItemSliding, IonModal, ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { Expense, ExpenseFormModel } from '../models/expense.model';
import { MonthPickerModalComponent } from '../components/month-picker-modal/month-picker-modal.component';
import { formatLocal, formatMonth, shiftMonth } from '../utils/date.utils';
import { getCurrencySymbol } from '../utils/currency.utils';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  @ViewChild(IonModal) modal!: IonModal;
  @ViewChild('customMonthPicker') customMonthPicker!: MonthPickerModalComponent;

  editingExpenseId: string | null = null;
  selectedMonth = this.dataService.selectedExpenseMonth;

  newExpense: ExpenseFormModel = this.createEmptyExpenseForm();

  readonly formatMonth = formatMonth;
  readonly getCurrencySymbol = getCurrencySymbol;

  groupedExpenses = computed(() => {
    const monthFilter = this.selectedMonth();
    const expenses = this.dataService.expenses().filter(e => e.date && e.date.startsWith(monthFilter));
    const groups: Record<string, { date: string; expenses: Expense[]; total: number }> = {};

    for (const e of expenses) {
      const dateKey = formatLocal(new Date(e.date));
      if (!groups[dateKey]) {
        groups[dateKey] = { date: e.date, expenses: [], total: 0 };
      }
      groups[dateKey].expenses.push(e);
      groups[dateKey].total += e.amount;
    }

    const sortedDates = Object.keys(groups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map(date => groups[date]);
  });

  constructor(public dataService: DataService, private toastCtrl: ToastController) {}

  ionViewWillLeave(): void {
    this.dataService.lastActiveTab = 'tab1';
  }

  openPicker(): void {
    this.customMonthPicker.present();
  }

  prevMonth(): void {
    this.selectedMonth.set(shiftMonth(this.selectedMonth(), -1));
  }

  nextMonth(): void {
    this.selectedMonth.set(shiftMonth(this.selectedMonth(), 1));
  }

  onMonthSelected(monthStr: string): void {
    this.selectedMonth.set(monthStr);
  }

  cancel(): void {
    this.modal.dismiss(null, 'cancel');
    this.resetForm();
  }

  async confirm(): Promise<void> {
    if (this.newExpense.amount && this.newExpense.category) {
      const expenseData = {
        amount: Number(this.newExpense.amount),
        category: this.newExpense.category,
        subcategory: this.newExpense.subcategory,
        description: this.newExpense.description || '',
        date: this.newExpense.date,
      };

      if (this.editingExpenseId) {
        this.dataService.editExpense(this.editingExpenseId, {
          ...expenseData,
          currency: this.newExpense.currency,
        });
      } else {
        this.dataService.addExpense(expenseData);
      }

      this.modal.dismiss(this.newExpense, 'confirm');
      this.resetForm();
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Please fill in all required fields.',
        duration: 2500,
        color: 'dark',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  resetForm(): void {
    this.editingExpenseId = null;
    this.newExpense = this.createEmptyExpenseForm();
  }

  onCategoryChange(): void {
    this.newExpense.subcategory = '';
  }

  openEditModal(expense: Expense, slidingItem?: IonItemSliding): void {
    slidingItem?.close();
    this.editingExpenseId = expense.id;
    this.newExpense = {
      amount: expense.amount,
      category: expense.category,
      subcategory: expense.subcategory || '',
      description: expense.description || '',
      date: expense.date,
      currency: expense.currency,
    };
    this.modal.present();
  }

  getSubcategories(): string[] {
    const cat = this.dataService.categories().find(c => c.name === this.newExpense.category);
    return cat ? cat.subcategories : [];
  }

  deleteExpense(id: string, slidingItem?: IonItemSliding): void {
    slidingItem?.close();
    this.dataService.deleteExpense(id);
  }

  private createEmptyExpenseForm(): ExpenseFormModel {
    return {
      amount: null,
      category: '',
      subcategory: '',
      description: '',
      date: new Date().toISOString(),
      currency: '',
    };
  }
}
