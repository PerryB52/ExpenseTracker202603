import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MonthPickerModalComponent } from './month-picker-modal.component';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [MonthPickerModalComponent],
  exports: [MonthPickerModalComponent],
})
export class MonthPickerModalModule {}

