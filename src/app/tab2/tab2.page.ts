import { Component, computed, signal, ViewChild } from '@angular/core';
import { IonModal } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { ChartType, GroupingType } from '../models/expense.model';
import { MonthPickerModalComponent } from '../components/month-picker-modal/month-picker-modal.component';
import {
  formatLocal,
  formatMonth,
  formatWeek,
  getMonday,
  parseLocal,
  shiftMonth,
} from '../utils/date.utils';
import {
  buildHistoryChartData,
  buildPieChartData,
  getCategoryColor,
  groupExpensesByPeriod,
} from '../utils/chart.utils';
import { getCurrencySymbol } from '../utils/currency.utils';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  groupingType = signal<GroupingType>('month');
  chartType = signal<ChartType>('pie');

  @ViewChild('customYearPicker') customYearPicker!: IonModal;
  @ViewChild('customMonthPicker') customMonthPicker!: MonthPickerModalComponent;
  @ViewChild('customWeekPicker') customWeekPicker!: IonModal;

  selectedMonth = signal<string>(formatLocal(new Date()).substring(0, 7));
  selectedYear = signal<number>(new Date().getFullYear());
  selectedWeekStart = signal<string>(formatLocal(getMonday(new Date())));
  pickerYear = signal<number>(new Date().getFullYear());

  isCategoryModalOpen = signal<boolean>(false);
  selectedDetailCategory = signal<string | null>(null);
  selectedSubcategoryFilter = signal<string | null>(null);

  readonly formatMonth = formatMonth;
  readonly formatWeek = formatWeek;
  readonly getCategoryColor = getCategoryColor;
  readonly getCurrencySymbol = getCurrencySymbol;

  periodExpenses = computed(() => {
    const type = this.groupingType();
    const expenses = this.dataService.expenses();

    if (type === 'year') {
      const yearStr = this.selectedYear().toString();
      return expenses.filter(e => e.date && e.date.startsWith(yearStr));
    }

    if (type === 'week') {
      const startStr = this.selectedWeekStart();
      const monDate = parseLocal(startStr);
      const sunDate = new Date(monDate);
      sunDate.setDate(sunDate.getDate() + 6);
      const endStr = formatLocal(sunDate);

      return expenses.filter(e => {
        if (!e.date) return false;
        const eDateStr = e.date.substring(0, 10);
        return eDateStr >= startStr && eDateStr <= endStr;
      });
    }

    const monthFilter = this.selectedMonth();
    return expenses.filter(e => e.date && e.date.startsWith(monthFilter));
  });

  groupedData = computed(() =>
    groupExpensesByPeriod(this.periodExpenses(), this.groupingType())
  );

  historyChartData = computed(() =>
    buildHistoryChartData(
      this.dataService.expenses(),
      this.groupingType(),
      this.selectedYear(),
      this.selectedMonth(),
      this.selectedWeekStart()
    )
  );

  maxHistoryValue = computed(() => {
    const data = this.historyChartData();
    return data.length === 0 ? 1 : Math.max(...data.map(d => d.total));
  });

  pieChartData = computed(() => buildPieChartData(this.groupedData()));

  categoryDetailsData = computed(() => {
    const parentCategory = this.selectedDetailCategory();
    if (!parentCategory) return null;

    const baseExpenses = [
      ...this.periodExpenses().filter(e => (e.category || 'Uncategorized') === parentCategory),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let total = 0;
    const subMap: Record<string, number> = {};

    for (const e of baseExpenses) {
      total += e.amount;
      const sub = e.subcategory || 'Uncategorized';
      subMap[sub] = (subMap[sub] || 0) + e.amount;
    }

    const subcategories = Object.keys(subMap)
      .map(sub => ({
        name: sub,
        amount: subMap[sub],
        percent: total > 0 ? (subMap[sub] / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const filterSub = this.selectedSubcategoryFilter();
    const filteredExpenses = filterSub
      ? baseExpenses.filter(e => (e.subcategory || 'Uncategorized') === filterSub)
      : baseExpenses;

    return {
      total,
      subcategories,
      expenses: filteredExpenses,
    };
  });

  constructor(public dataService: DataService) {}

  ionViewWillEnter(): void {
    if (this.dataService.lastActiveTab === 'tab1') {
      const tab1Month = this.dataService.selectedExpenseMonth();
      const year = parseInt(tab1Month.substring(0, 4), 10);
      this.selectedMonth.set(tab1Month);
      this.pickerYear.set(year);
      this.selectedYear.set(year);
      this.groupingType.set('month');
    }
  }

  ionViewWillLeave(): void {
    this.dataService.lastActiveTab = 'tab2';
  }

  openPicker(): void {
    if (this.groupingType() === 'year') {
      this.pickerYear.set(this.selectedYear());
      this.customYearPicker.present();
    } else if (this.groupingType() === 'week') {
      this.customWeekPicker.present();
    } else {
      this.customMonthPicker.present();
    }
  }

  changePickerYear(delta: number): void {
    this.pickerYear.update(y => y + delta);
  }

  prevDate(): void {
    if (this.groupingType() === 'year') {
      this.selectedYear.update(y => y - 1);
    } else if (this.groupingType() === 'week') {
      const d = parseLocal(this.selectedWeekStart());
      d.setDate(d.getDate() - 7);
      this.selectedWeekStart.set(formatLocal(d));
    } else {
      this.selectedMonth.set(shiftMonth(this.selectedMonth(), -1));
    }
  }

  nextDate(): void {
    if (this.groupingType() === 'year') {
      this.selectedYear.update(y => y + 1);
    } else if (this.groupingType() === 'week') {
      const d = parseLocal(this.selectedWeekStart());
      d.setDate(d.getDate() + 7);
      this.selectedWeekStart.set(formatLocal(d));
    } else {
      this.selectedMonth.set(shiftMonth(this.selectedMonth(), 1));
    }
  }

  onMonthSelected(monthStr: string): void {
    this.selectedMonth.set(monthStr);
  }

  isYearSelected(year: number): boolean {
    return this.selectedYear() === year;
  }

  selectYearBtn(year: number): void {
    this.selectedYear.set(year);
    this.customYearPicker.dismiss();
  }

  selectThisYear(): void {
    this.selectedYear.set(new Date().getFullYear());
    this.customYearPicker.dismiss();
  }

  onWeekDateSelected(event: any): void {
    if (!event.detail.value) return;
    const selectedDate = parseLocal(event.detail.value as string);
    this.selectedWeekStart.set(formatLocal(getMonday(selectedDate)));
    this.customWeekPicker.dismiss();
  }

  selectThisWeek(): void {
    this.selectedWeekStart.set(formatLocal(getMonday(new Date())));
    this.customWeekPicker.dismiss();
  }

  getHistoryChartHeight(total: number): number {
    const max = this.maxHistoryValue();
    return max === 0 ? 10 : Math.max((total / max) * 100, 10);
  }

  formatChartLabel(label: string): string {
    const type = this.groupingType();
    if (type === 'week') {
      const dateStr = label.replace('Week of ', '');
      const parts = dateStr.split('-');
      return `${parts[1]}/${parts[2]}`;
    }
    if (type === 'month') {
      const parts = label.split('-');
      return `${parts[1]}/${parts[0].substring(2)}`;
    }
    return label;
  }

  onGroupingChange(event: any): void {
    this.groupingType.set(event.detail.value);
  }

  openCategoryDetails(categoryName: string): void {
    this.selectedDetailCategory.set(categoryName);
    this.selectedSubcategoryFilter.set(null);
    this.isCategoryModalOpen.set(true);
  }

  closeCategoryDetails(): void {
    this.isCategoryModalOpen.set(false);
  }

  toggleSubcategoryFilter(sub: string): void {
    this.selectedSubcategoryFilter.update(cur => (cur === sub ? null : sub));
  }
}
