import { Component } from '@angular/core';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  newCategory: string = '';
  editingCategory: string | null = null;
  editCategoryValue: string = '';

  constructor(public dataService: DataService) {}

  addCategory() {
    if (this.newCategory.trim()) {
      this.dataService.addCategory(this.newCategory);
      this.newCategory = ''; // Reset input
    }
  }

  startEdit(cat: string) {
    this.editingCategory = cat;
    this.editCategoryValue = cat;
  }

  saveEdit() {
    if (this.editingCategory && this.editCategoryValue.trim()) {
      this.dataService.editCategory(this.editingCategory, this.editCategoryValue);
    }
    this.editingCategory = null;
    this.editCategoryValue = '';
  }

  cancelEdit() {
    this.editingCategory = null;
    this.editCategoryValue = '';
  }

  deleteCategory(cat: string) {
    this.dataService.deleteCategory(cat);
  }
  
  clearData() {
    console.log("Settings action: clearData");
  }
}
