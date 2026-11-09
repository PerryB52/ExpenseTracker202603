import { Component, ViewChild } from '@angular/core';
import { IonModal, AlertController, ToastController } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { CsvService } from '../services/csv.service';
import { ThemeService } from '../services/theme.service';
import { SecurityService } from '../services/security.service';
import { ThemeId } from '../models/expense.model';
import { SUPPORTED_CURRENCIES } from '../utils/currency.utils';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  @ViewChild('categoriesModal') categoriesModal!: IonModal;
  @ViewChild('themesModal') themesModal!: IonModal;
  @ViewChild('securityModal') securityModal!: IonModal;
  @ViewChild('currencyModal') currencyModal!: IonModal;

  readonly currencies = SUPPORTED_CURRENCIES;

  newCategory = '';
  editingCategory: string | null = null;
  editCategoryValue = '';

  newSubcategory: Record<string, string> = {};
  editingSubcategory: { parent: string; oldSub: string } | null = null;
  editSubcategoryValue = '';

  constructor(
    public dataService: DataService,
    public themeService: ThemeService,
    public securityService: SecurityService,
    private csvService: CsvService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
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

  closeSecurityModal(): void {
    this.securityModal.dismiss();
  }

  closeCurrencyModal(): void {
    this.currencyModal.dismiss();
  }

  selectTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
  }

  selectCurrency(code: string): void {
    this.dataService.setActiveCurrency(code);
    this.currencyModal.dismiss();
  }

  async onAppLockToggle(event: any): Promise<void> {
    const wantEnabled = event.detail.checked;
    if (wantEnabled === this.securityService.isAppLockEnabled()) return;

    if (wantEnabled) {
      await this.promptSetNewPin(true);
    } else {
      await this.promptVerifyAndDisablePin();
    }
  }

  async promptSetNewPin(isInitialEnable = false): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: isInitialEnable ? 'Set 4-Digit PIN' : 'Change 4-Digit PIN',
      message: 'Enter a 4-digit numeric PIN to protect your expenses.',
      backdropDismiss: false,
      inputs: [
        {
          name: 'pin',
          type: 'password',
          placeholder: '4-digit PIN',
          attributes: { maxlength: 4, inputmode: 'numeric' },
        },
        {
          name: 'confirmPin',
          type: 'password',
          placeholder: 'Confirm 4-digit PIN',
          attributes: { maxlength: 4, inputmode: 'numeric' },
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save PIN',
          handler: async data => {
            const pin = (data.pin || '').trim();
            const confirmPin = (data.confirmPin || '').trim();
            if (!/^\d{4}$/.test(pin)) {
              await this.showToast('PIN must be exactly 4 digits (0-9).');
              return false;
            }
            if (pin !== confirmPin) {
              await this.showToast('PINs do not match.');
              return false;
            }
            await this.securityService.enableAppLock(pin);
            await this.showToast('App Lock PIN saved.');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async promptVerifyAndDisablePin(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Disable App Lock',
      message: 'Enter your current 4-digit PIN to disable App Lock.',
      backdropDismiss: false,
      inputs: [
        {
          name: 'pin',
          type: 'password',
          placeholder: 'Current 4-digit PIN',
          attributes: { maxlength: 4, inputmode: 'numeric' },
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Disable',
          role: 'destructive',
          handler: async data => {
            const valid = await this.securityService.verifyPin((data.pin || '').trim());
            if (!valid) {
              await this.showToast('Incorrect PIN.');
              return false;
            }
            await this.securityService.disableAppLock();
            await this.showToast('App Lock disabled.');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async onBiometricToggle(event: any): Promise<void> {
    const wantEnabled = event.detail.checked;
    if (wantEnabled === this.securityService.isBiometricEnabled()) return;

    const ok = await this.securityService.setBiometricEnabled(wantEnabled);
    if (!ok && wantEnabled) {
      event.target.checked = false;
      await this.showToast('Device biometrics or secure lock screen not available.');
    }
  }

  async onPrivacyScreenToggle(event: any): Promise<void> {
    const wantEnabled = event.detail.checked;
    await this.securityService.setPrivacyScreenEnabled(wantEnabled);
  }

  lockAppNow(): void {
    this.securityModal.dismiss();
    this.securityService.lockNow();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2400,
      color: 'dark',
      position: 'bottom',
    });
    await toast.present();
  }

  async addCategory(): Promise<void> {
    const trimmed = this.newCategory.trim();
    if (!trimmed) return;

    if (this.dataService.categories().some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      await this.showToast(`Category "${trimmed}" already exists.`);
      return;
    }

    await this.dataService.addCategory(trimmed);
    this.newCategory = '';
  }

  startEdit(catName: string): void {
    this.editingCategory = catName;
    this.editCategoryValue = catName;
  }

  async saveEdit(): Promise<void> {
    if (this.editingCategory && this.editCategoryValue.trim()) {
      const trimmed = this.editCategoryValue.trim();
      if (
        trimmed.toLowerCase() !== this.editingCategory.toLowerCase() &&
        this.dataService.categories().some(c => c.name.toLowerCase() === trimmed.toLowerCase())
      ) {
        await this.showToast(`Category "${trimmed}" already exists.`);
        return;
      }
      await this.dataService.editCategory(this.editingCategory, trimmed);
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

  async addSubcategory(parentName: string): Promise<void> {
    const sub = this.newSubcategory[parentName]?.trim();
    if (!sub) return;

    const parent = this.dataService.categories().find(c => c.name === parentName);
    if (parent && parent.subcategories.some(s => s.toLowerCase() === sub.toLowerCase())) {
      await this.showToast(`Subcategory "${sub}" already exists in ${parentName}.`);
      return;
    }

    await this.dataService.addSubcategory(parentName, sub);
    this.newSubcategory[parentName] = '';
  }

  startEditSub(parentName: string, subName: string): void {
    this.editingSubcategory = { parent: parentName, oldSub: subName };
    this.editSubcategoryValue = subName;
  }

  async saveEditSub(): Promise<void> {
    if (this.editingSubcategory && this.editSubcategoryValue.trim()) {
      const trimmed = this.editSubcategoryValue.trim();
      const parent = this.dataService.categories().find(c => c.name === this.editingSubcategory!.parent);
      if (
        parent &&
        trimmed.toLowerCase() !== this.editingSubcategory.oldSub.toLowerCase() &&
        parent.subcategories.some(s => s.toLowerCase() === trimmed.toLowerCase())
      ) {
        await this.showToast(`Subcategory "${trimmed}" already exists in ${parent.name}.`);
        return;
      }
      await this.dataService.editSubcategory(
        this.editingSubcategory.parent,
        this.editingSubcategory.oldSub,
        trimmed
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

  async exportCSV(): Promise<void> {
    const success = await this.csvService.exportToCSV();
    if (success) {
      await this.showToast('Export Successful');
    } else {
      await this.showToast('Export Failed');
    }
  }

  async importCSV(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (file) {
      const success = await this.csvService.importFromCSV(file);
      event.target.value = '';
      if (success) {
        await this.showToast('Import Successful');
      } else {
        await this.showToast('Import Failed');
      }
    }
  }

  async importExternalCSV(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (file) {
      const success = await this.csvService.importExternalCSV(file);
      event.target.value = '';
      if (success) {
        await this.showToast('Import Successful');
      } else {
        await this.showToast('Import Failed');
      }
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
