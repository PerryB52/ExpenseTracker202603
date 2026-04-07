import { Component, computed, signal, ViewChild } from '@angular/core';
import { DataService, Expense } from '../services/data.service';
import { IonModal } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  groupingType = signal<'week' | 'month' | 'year'>('month');
  
  @ViewChild('customYearPicker') customYearPicker!: IonModal;
  @ViewChild('customMonthPicker') customMonthPicker!: IonModal;
  selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));
  selectedYear = signal<number>(new Date().getFullYear());
  pickerYear = signal<number>(new Date().getFullYear());
  monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  openPicker() {
    if (this.groupingType() === 'year') {
      this.pickerYear.set(this.selectedYear());
      this.customYearPicker.present();
    } else {
      this.pickerYear.set(parseInt(this.selectedMonth().substring(0, 4)));
      this.customMonthPicker.present();
    }
  }

  changePickerYear(delta: number) {
    this.pickerYear.update(y => y + delta);
  }

  prevDate() {
    if (this.groupingType() === 'year') {
      this.selectedYear.update(y => y - 1);
    } else {
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
  }

  nextDate() {
    if (this.groupingType() === 'year') {
      this.selectedYear.update(y => y + 1);
    } else {
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

  isYearSelected(year: number): boolean {
    return this.selectedYear() === year;
  }

  selectYearBtn(year: number) {
    this.selectedYear.set(year);
    this.customYearPicker.dismiss();
  }

  selectThisYear() {
    const now = new Date();
    this.selectedYear.set(now.getFullYear());
    this.customYearPicker.dismiss();
  }

  formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
  }

  groupedData = computed(() => {
    const type = this.groupingType();
    
    // Filter expenses by the selected period first
    let expenses = this.dataService.expenses();
    if (type === 'year') {
      const yearStr = this.selectedYear().toString();
      expenses = expenses.filter(e => e.date && e.date.startsWith(yearStr));
    } else {
      const monthFilter = this.selectedMonth();
      expenses = expenses.filter(e => e.date && e.date.startsWith(monthFilter));
    }
    
    const groups: { 
      [key: string]: { 
        total: number, 
        categoriesMap: { [cat: string]: number } 
      } 
    } = {};
    
    expenses.forEach(e => {
      let key = '';
      const d = new Date(e.date);
      
      switch (type) {
        case 'week':
          const dayOfWeek = d.getDay() || 7;  
          const monday = new Date(d);
          monday.setDate(monday.getDate() - dayOfWeek + 1);
          key = `Week of ${monday.getFullYear()}-${(monday.getMonth() + 1).toString().padStart(2, '0')}-${monday.getDate().toString().padStart(2, '0')}`;
          break;
        case 'month':
          key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'year':
          key = `${d.getFullYear()}`;
          break;
      }
      
      if (!groups[key]) {
        groups[key] = { total: 0, categoriesMap: {} };
      }
      
      groups[key].total += e.amount;
      const cat = e.category || 'Uncategorized';
      groups[key].categoriesMap[cat] = (groups[key].categoriesMap[cat] || 0) + e.amount;
    });

    const entries = Object.keys(groups).map(k => {
      const catEntries = Object.keys(groups[k].categoriesMap).map(c => ({
        category: c,
        amount: groups[k].categoriesMap[c]
      })).sort((a, b) => b.amount - a.amount);
      
      return {
        label: k,
        total: groups[k].total,
        categories: catEntries
      };
    });
    
    entries.sort((a, b) => b.label.localeCompare(a.label));
    
    return entries;
  });

  chartData = computed(() => {
    return this.groupedData().slice(0, 7).reverse();
  });

  maxChartValue = computed(() => {
    const data = this.chartData();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.total));
  });

  constructor(public dataService: DataService) {}
  
  getChartHeight(total: number): number {
    const max = this.maxChartValue();
    if (max === 0) return 10;
    return Math.max((total / max) * 100, 10);
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

  onGroupingChange(event: any) {
    this.groupingType.set(event.detail.value);
  }
}
