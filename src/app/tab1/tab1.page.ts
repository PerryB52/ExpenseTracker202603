import { Component, ViewChild, computed, signal } from '@angular/core';
import { AlertController, IonModal, ToastController } from '@ionic/angular';
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

  // Multi-select deletion state
  readonly selectedExpenseIds = signal<Set<string>>(new Set<string>());
  readonly isSelectionMode = computed(() => this.selectedExpenseIds().size > 0);
  readonly selectedCount = computed(() => this.selectedExpenseIds().size);

  // Long-press detection state
  private longPressTimer: any = null;
  private longPressFired = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly LONG_PRESS_DURATION = 500;
  private readonly MOVE_THRESHOLD = 10;

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

  constructor(
    public dataService: DataService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ionViewWillLeave(): void {
    this.dataService.lastActiveTab = 'tab1';
    this.exitSelectionMode();
  }

  openPicker(): void {
    this.customMonthPicker.present();
  }

  prevMonth(): void {
    this.exitSelectionMode();
    this.selectedMonth.set(shiftMonth(this.selectedMonth(), -1));
  }

  nextMonth(): void {
    this.exitSelectionMode();
    this.selectedMonth.set(shiftMonth(this.selectedMonth(), 1));
  }

  onMonthSelected(monthStr: string): void {
    this.exitSelectionMode();
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

  openEditModal(expense: Expense): void {
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

  deleteExpense(id: string): void {
    this.dataService.deleteExpense(id);
  }

  // Pointer event handlers for Long Press and Multi-Selection
  onItemPointerDown(expense: Expense, event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    this.longPressFired = false;
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.clearLongPressTimer();

    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.triggerLongPress(expense);
    }, this.LONG_PRESS_DURATION);
  }

  onItemPointerMove(event: PointerEvent): void {
    if (this.longPressTimer) {
      const moveX = Math.abs(event.clientX - this.touchStartX);
      const moveY = Math.abs(event.clientY - this.touchStartY);
      if (moveX > this.MOVE_THRESHOLD || moveY > this.MOVE_THRESHOLD) {
        this.clearLongPressTimer();
      }
    }
  }

  onItemPointerUp(event: PointerEvent): void {
    this.clearLongPressTimer();
  }

  onItemPointerCancel(event: PointerEvent): void {
    this.clearLongPressTimer();
  }

  onItemContextMenu(expense: Expense, event: MouseEvent): void {
    event.preventDefault();
    this.toggleExpenseSelection(expense.id);
  }

  onItemClick(expense: Expense, event: MouseEvent): void {
    if (this.longPressFired) {
      this.longPressFired = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (this.isSelectionMode()) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleExpenseSelection(expense.id);
      return;
    }

    this.openEditModal(expense);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private triggerLongPress(expense: Expense): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch (_) {}
    }
    this.toggleExpenseSelection(expense.id);
  }

  isSelected(id: string): boolean {
    return this.selectedExpenseIds().has(id);
  }

  toggleExpenseSelection(id: string): void {
    this.selectedExpenseIds.update(currentSet => {
      const nextSet = new Set(currentSet);
      if (nextSet.has(id)) {
        nextSet.delete(id);
      } else {
        nextSet.add(id);
      }
      return nextSet;
    });
  }

  exitSelectionMode(): void {
    this.clearLongPressTimer();
    this.longPressFired = false;
    this.selectedExpenseIds.set(new Set<string>());
  }

  async confirmDeleteSelected(): Promise<void> {
    const ids = Array.from(this.selectedExpenseIds());
    if (ids.length === 0) return;

    const count = ids.length;
    const alert = await this.alertCtrl.create({
      header: count === 1 ? 'Delete Expense' : 'Delete Expenses',
      message: `Are you sure you want to delete ${count === 1 ? 'this expense' : count + ' expenses'}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.dataService.deleteExpenses(ids);
            this.exitSelectionMode();
            const toast = await this.toastCtrl.create({
              message: `${count} ${count === 1 ? 'expense' : 'expenses'} deleted.`,
              duration: 2000,
              color: 'dark',
              position: 'bottom',
            });
            await toast.present();
          },
        },
      ],
    });
    await alert.present();
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
