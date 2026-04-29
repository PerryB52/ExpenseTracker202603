import { Component, computed, signal, ViewChild } from '@angular/core';
import { DataService, Expense } from '../services/data.service';
import { IonModal } from '@ionic/angular';

function parseLocal(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.substring(0, 10).split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  groupingType = signal<'week' | 'month' | 'year'>('month');
  chartType = signal<'bar' | 'pie'>('pie');
  
  @ViewChild('customYearPicker') customYearPicker!: IonModal;
  @ViewChild('customMonthPicker') customMonthPicker!: IonModal;
  @ViewChild('customWeekPicker') customWeekPicker!: IonModal;
  selectedMonth = signal<string>(formatLocal(new Date()).substring(0, 7));
  selectedYear = signal<number>(new Date().getFullYear());
  selectedWeekStart = signal<string>(formatLocal(getMonday(new Date())));
  pickerYear = signal<number>(new Date().getFullYear());
  monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  openPicker() {
    if (this.groupingType() === 'year') {
      this.pickerYear.set(this.selectedYear());
      this.customYearPicker.present();
    } else if (this.groupingType() === 'week') {
      this.customWeekPicker.present();
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
    } else if (this.groupingType() === 'week') {
      const d = parseLocal(this.selectedWeekStart());
      d.setDate(d.getDate() - 7);
      this.selectedWeekStart.set(formatLocal(d));
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
    } else if (this.groupingType() === 'week') {
      const d = parseLocal(this.selectedWeekStart());
      d.setDate(d.getDate() + 7);
      this.selectedWeekStart.set(formatLocal(d));
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

  onWeekDateSelected(event: any) {
    if (!event.detail.value) return;
    const selectedDate = parseLocal(event.detail.value as string);
    const monday = getMonday(selectedDate);
    this.selectedWeekStart.set(formatLocal(monday));
    this.customWeekPicker.dismiss();
  }

  selectThisWeek() {
    const monday = getMonday(new Date());
    this.selectedWeekStart.set(formatLocal(monday));
    this.customWeekPicker.dismiss();
  }

  formatWeek(dateStr: string): string {
    if (!dateStr) return '';
    const d = parseLocal(dateStr);
    const sunday = new Date(d);
    sunday.setDate(sunday.getDate() + 6);
    
    const startMonth = (d.getMonth() + 1).toString().padStart(2, '0');
    const startDate = d.getDate().toString().padStart(2, '0');
    const endMonth = (sunday.getMonth() + 1).toString().padStart(2, '0');
    const endDate = sunday.getDate().toString().padStart(2, '0');
    
    return `${startMonth}/${startDate} - ${endMonth}/${endDate}`;
  }

  formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
  }

  periodExpenses = computed(() => {
    const type = this.groupingType();
    let expenses = this.dataService.expenses();
    if (type === 'year') {
      const yearStr = this.selectedYear().toString();
      expenses = expenses.filter(e => e.date && e.date.startsWith(yearStr));
    } else if (type === 'week') {
      const startStr = this.selectedWeekStart();
      const monDate = parseLocal(startStr);
      const sunDate = new Date(monDate);
      sunDate.setDate(sunDate.getDate() + 6);
      const endStr = formatLocal(sunDate);
      
      expenses = expenses.filter(e => {
        if (!e.date) return false;
        const eDateStr = e.date.substring(0, 10);
        return eDateStr >= startStr && eDateStr <= endStr;
      });
    } else {
      const monthFilter = this.selectedMonth();
      expenses = expenses.filter(e => e.date && e.date.startsWith(monthFilter));
    }
    return expenses;
  });

  groupedData = computed(() => {
    const type = this.groupingType();
    const expenses = this.periodExpenses();
    
    const groups: { 
      [key: string]: { 
        total: number, 
        categoriesMap: { [cat: string]: number } 
      } 
    } = {};
    
    expenses.forEach(e => {
      let key = '';
      const d = parseLocal(e.date);
      
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
      const catEntries = Object.keys(groups[k].categoriesMap).map(c => {
        const amount = groups[k].categoriesMap[c];
        const percent = Math.round((amount / groups[k].total) * 100);
        return {
          category: c,
          amount: amount,
          percent: percent
        };
      }).sort((a, b) => b.amount - a.amount);
      
      return {
        label: k,
        total: groups[k].total,
        categories: catEntries
      };
    });
    
    entries.sort((a, b) => b.label.localeCompare(a.label));
    
    return entries;
  });

  historyChartData = computed(() => {
    const type = this.groupingType();
    const allExpenses = this.dataService.expenses();
    
    let periods: string[] = [];
    
    if (type === 'year') {
      const selected = this.selectedYear();
      for (let i = 5; i >= 0; i--) {
        periods.push((selected - i).toString());
      }
    } else if (type === 'month') {
      const [y, mStr] = this.selectedMonth().split('-');
      let year = parseInt(y);
      let month = parseInt(mStr);
      for (let i = 5; i >= 0; i--) {
        let curM = month - i;
        let curY = year;
        while (curM <= 0) {
          curM += 12;
          curY -= 1;
        }
        periods.push(`${curY}-${curM.toString().padStart(2, '0')}`);
      }
    } else if (type === 'week') {
      const selected = parseLocal(this.selectedWeekStart());
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selected);
        d.setDate(d.getDate() - (i * 7));
        periods.push(formatLocal(d));
      }
    }

    const groups: { [key: string]: number } = {};
    periods.forEach(p => groups[p] = 0);
    
    allExpenses.forEach(e => {
      const d = parseLocal(e.date);
      let key = '';
      if (type === 'year') {
        key = d.getFullYear().toString();
      } else if (type === 'month') {
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      } else if (type === 'week') {
        const monday = getMonday(d);
        key = formatLocal(monday);
      }
      
      if (groups[key] !== undefined) {
        groups[key] += e.amount;
      }
    });

    return periods.map(p => ({
      label: p,
      total: groups[p]
    }));
  });

  maxHistoryValue = computed(() => {
    const data = this.historyChartData();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.total));
  });

  getCategoryColor(i: number): string {
    const topColors = [
      '#ff6b6b', // 1st: red
      '#ff9f43', // 2nd: orange
      '#ffc048', // 3rd: light orange
      '#f9ca24', // 4th: darker yellow
      '#f6e58d', // 5th: lighter yellow
      '#2ecc71', // 6th: green
      '#badc58', // 7th: light green
    ];
    const palette = ['#00d2d3', '#54a0ff', '#5f27cd', '#c8d6e5', '#ff9ff3', '#0abde3'];
    return i < 7 ? topColors[i] : palette[(i - 7) % palette.length];
  }

  pieChartData = computed(() => {
    const data = this.groupedData();
    if (data.length === 0 || data[0].total === 0) return { paths: [], labels: [], legend: [] };
    
    const categories = data[0].categories;
    const total = data[0].total;

    let legend: { name: string, percent: number, amount: number, color: string }[] = [];
    let svgPaths: { path: string, color: string }[] = [];
    let svgLabels: any[] = [];
    
    let currentAngle = 0;

    categories.forEach((cat, i) => {
      const fraction = cat.amount / total;
      const color = this.getCategoryColor(i);
      
      const angle = fraction * Math.PI * 2;
      const startAngle = currentAngle - Math.PI / 2;
      const endAngle = currentAngle + angle - Math.PI / 2;
      
      const startX = Math.cos(startAngle);
      const startY = Math.sin(startAngle);
      const endX = Math.cos(endAngle);
      const endY = Math.sin(endAngle);
      
      const largeArcFlag = fraction > 0.5 ? 1 : 0;
      
      let pathData = '';
      if (fraction >= 0.9999) {
        pathData = `M -1 0 A 1 1 0 1 1 1 0 A 1 1 0 1 1 -1 0 Z`;
      } else {
        pathData = [
          `M 0 0`,
          `L ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `Z`
        ].join(' ');
      }
      
      svgPaths.push({
        path: pathData,
        color: color
      });

      // Floating labels for slices >= 4%
      if (fraction >= 0.04) {
        const midAngle = currentAngle + angle / 2 - Math.PI / 2;
        
        const lineStartX = Math.cos(midAngle) * 0.95;
        const lineStartY = Math.sin(midAngle) * 0.95;
        
        let lineOuterX = Math.cos(midAngle) * 1.15;
        let lineOuterY = Math.sin(midAngle) * 1.15;
        
        const isRight = Math.cos(midAngle) >= 0;
        const lineEndX = lineOuterX + (isRight ? 0.15 : -0.15);
        
        const textX = lineEndX + (isRight ? 0.05 : -0.05);
        const textY1 = lineOuterY - 0.02; 
        const textY2 = lineOuterY + 0.11;
        
        svgLabels.push({
          linePath: `M ${lineStartX} ${lineStartY} L ${lineOuterX} ${lineOuterY} L ${lineEndX} ${lineOuterY}`,
          color: color,
          textX: textX,
          textY1: textY1,
          textY2: textY2,
          anchor: isRight ? 'start' : 'end',
          category: cat.category,
          percent: (fraction * 100).toFixed(1) + ' %'
        });
      }

      legend.push({
        name: cat.category,
        percent: fraction * 100,
        amount: cat.amount,
        color: color
      });
      
      currentAngle += angle;
    });

    return {
      paths: svgPaths,
      labels: svgLabels,
      legend: legend
    };
  });

  constructor(public dataService: DataService) {}
  
  getHistoryChartHeight(total: number): number {
    const max = this.maxHistoryValue();
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

  isCategoryModalOpen = signal<boolean>(false);
  selectedDetailCategory = signal<string | null>(null);
  selectedSubcategoryFilter = signal<string | null>(null);

  categoryDetailsData = computed(() => {
    const parentCategory = this.selectedDetailCategory();
    if (!parentCategory) return null;

    const baseExpenses = [...this.periodExpenses().filter(e => (e.category || 'Uncategorized') === parentCategory)];
    baseExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let total = 0;
    const subMap: { [sub: string]: number } = {};

    baseExpenses.forEach(e => {
        total += e.amount;
        const sub = e.subcategory || 'Uncategorized';
        subMap[sub] = (subMap[sub] || 0) + e.amount;
    });

    const subcategories = Object.keys(subMap).map(sub => ({
        name: sub,
        amount: subMap[sub],
        percent: total > 0 ? (subMap[sub] / total) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    const filterSub = this.selectedSubcategoryFilter();
    const filteredExpenses = filterSub 
        ? baseExpenses.filter(e => (e.subcategory || 'Uncategorized') === filterSub)
        : baseExpenses;

    return {
        total,
        subcategories,
        expenses: filteredExpenses
    };
  });

  openCategoryDetails(categoryName: string) {
    this.selectedDetailCategory.set(categoryName);
    this.selectedSubcategoryFilter.set(null);
    this.isCategoryModalOpen.set(true);
  }

  closeCategoryDetails() {
    this.isCategoryModalOpen.set(false);
  }

  toggleSubcategoryFilter(sub: string) {
    if (this.selectedSubcategoryFilter() === sub) {
        this.selectedSubcategoryFilter.set(null);
    } else {
        this.selectedSubcategoryFilter.set(sub);
    }
  }

  getCurrencySymbol(code: string): string {
    const map: any = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': '$', 'RON': 'lei' };
    return map[code] || code;
  }
}
