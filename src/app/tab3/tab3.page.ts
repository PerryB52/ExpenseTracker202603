import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController } from '@ionic/angular';
import { DataService, Category } from '../services/data.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  @ViewChild('categoriesModal') categoriesModal!: IonModal;

  newCategory: string = '';
  editingCategory: string | null = null;
  editCategoryValue: string = '';

  newSubcategory: { [parentName: string]: string } = {};
  editingSubcategory: { parent: string, oldSub: string } | null = null;
  editSubcategoryValue: string = '';

  constructor(public dataService: DataService, private alertCtrl: AlertController) {}

  closeCategoriesModal() {
    this.categoriesModal.dismiss();
  }

  addCategory() {
    if (this.newCategory.trim()) {
      this.dataService.addCategory(this.newCategory);
      this.newCategory = ''; // Reset input
    }
  }

  startEdit(catName: string) {
    this.editingCategory = catName;
    this.editCategoryValue = catName;
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

  deleteCategory(catName: string) {
    this.dataService.deleteCategory(catName);
  }

  // --- Subcategories ---
  addSubcategory(parentName: string) {
    const sub = this.newSubcategory[parentName];
    if (sub && sub.trim()) {
      this.dataService.addSubcategory(parentName, sub);
      this.newSubcategory[parentName] = '';
    }
  }

  startEditSub(parentName: string, subName: string) {
    this.editingSubcategory = { parent: parentName, oldSub: subName };
    this.editSubcategoryValue = subName;
  }

  saveEditSub() {
    if (this.editingSubcategory && this.editSubcategoryValue.trim()) {
      this.dataService.editSubcategory(this.editingSubcategory.parent, this.editingSubcategory.oldSub, this.editSubcategoryValue);
    }
    this.editingSubcategory = null;
    this.editSubcategoryValue = '';
  }

  cancelEditSub() {
    this.editingSubcategory = null;
    this.editSubcategoryValue = '';
  }

  deleteSubcategory(parentName: string, subName: string) {
    this.dataService.deleteSubcategory(parentName, subName);
  }
  
  exportCSV() {
    this.dataService.exportToCSV();
  }

  async importCSV(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      await this.dataService.importFromCSV(file);
      event.target.value = ''; 
    }
  }

  async clearData() {
    const alert = await this.alertCtrl.create({
      header: 'Delete Expenses?',
      message: 'Are you sure you want to completely erase all expense history? This action cannot be undone!',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive', 
          handler: () => {
            this.dataService.clearAllData();
          }
        }
      ]
    });
    await alert.present();
  }
}
