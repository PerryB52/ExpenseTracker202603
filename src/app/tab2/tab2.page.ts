import { Component, computed } from '@angular/core';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  stats = computed(() => this.dataService.getStats());

  constructor(public dataService: DataService) {}
  
  getCategoryKeys() {
    return Object.keys(this.stats().byCategory);
  }
}
