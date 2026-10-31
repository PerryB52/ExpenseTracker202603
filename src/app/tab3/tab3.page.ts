import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { CsvService } from '../services/csv.service';
import { ThemeService } from '../services/theme.service';
import { ThemeId } from '../models/expense.model';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  @ViewChild('categoriesModal') categoriesModal!: IonModal;
  @ViewChild('themesModal') themesModal!: IonModal;

  newCategory = '';
  editingCategory: string | null = null;
  editCategoryValue = '';

  newSubcategory: Record<string, string> = {};
  editingSubcategory: { parent: string; oldSub: string } | null = null;
  editSubcategoryValue = '';

  constructor(
    public dataService: DataService,
    public themeService: ThemeService,
    private csvService: CsvService,
    private alertCtrl: AlertController
  ) {}

  ionViewWillLeave(): void {
    this.dataService.lastActiveTab = 'tab3';
  }

  closeCategoriesModal(): void {
    this.categoriesModal.dismiss();
  }

  closeThemesModal(): void {
    this.themesModal.dismiss();
  }

  selectTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
  }

  addCategory(): void {
    if (this.newCategory.trim()) {
      this.dataService.addCategory(this.newCategory);
      this.newCategory = '';
    }
  }

  startEdit(catName: string): void {
    this.editingCategory = catName;
    this.editCategoryValue = catName;
  }

  saveEdit(): void {
    if (this.editingCategory && this.editCategoryValue.trim()) {
      this.dataService.editCategory(this.editingCategory, this.editCategoryValue);
    }
    this.editingCategory = null;
    this.editCategoryValue = '';
  }

  cancelEdit(): void {
    this.editingCategory = null;
    this.editCategoryValue = '';
  }

  deleteCategory(catName: string): void {
    this.dataService.deleteCategory(catName);
  }

  addSubcategory(parentName: string): void {
    const sub = this.newSubcategory[parentName];
    if (sub && sub.trim()) {
      this.dataService.addSubcategory(parentName, sub);
      this.newSubcategory[parentName] = '';
    }
  }

  startEditSub(parentName: string, subName: string): void {
    this.editingSubcategory = { parent: parentName, oldSub: subName };
    this.editSubcategoryValue = subName;
  }

  saveEditSub(): void {
    if (this.editingSubcategory && this.editSubcategoryValue.trim()) {
      this.dataService.editSubcategory(
        this.editingSubcategory.parent,
        this.editingSubcategory.oldSub,
        this.editSubcategoryValue
      );
    }
    this.editingSubcategory = null;
    this.editSubcategoryValue = '';
  }

  cancelEditSub(): void {
    this.editingSubcategory = null;
    this.editSubcategoryValue = '';
  }

  deleteSubcategory(parentName: string, subName: string): void {
    this.dataService.deleteSubcategory(parentName, subName);
  }

  exportCSV(): void {
    this.csvService.exportToCSV();
  }

  async importCSV(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (file) {
      await this.csvService.importFromCSV(file);
      event.target.value = '';
    }
  }

  async importExternalCSV(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (file) {
      await this.csvService.importExternalCSV(file);
      event.target.value = '';
    }
  }

  async clearData(): Promise<void> {
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
          },
        },
      ],
    });
    await alert.present();
  }
}
