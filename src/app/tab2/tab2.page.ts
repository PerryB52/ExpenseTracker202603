import { Component, computed, signal } from '@angular/core';
import { DataService, Expense } from '../services/data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  groupingType = signal<'day' | 'week' | 'month' | 'year'>('day');


  groupedData = computed(() => {
    const expenses = this.dataService.expenses();
    const type = this.groupingType();
    
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
        case 'day':
          key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
          break;
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
    if (type === 'day') {
      const parts = label.split('-');
      return `${parts[1]}/${parts[2]}`;
    }
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
