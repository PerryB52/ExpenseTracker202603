import { Component, EventEmitter, Input, Output, ViewChild, signal } from '@angular/core';
import { IonModal } from '@ionic/angular';
import { MONTH_NAMES } from '../../utils/date.utils';

@Component({
  selector: 'app-month-picker-modal',
  templateUrl: './month-picker-modal.component.html',
  styleUrls: ['./month-picker-modal.component.scss'],
  standalone: false,
})
export class MonthPickerModalComponent {
  @ViewChild('modal') modal!: IonModal;

  @Input({ required: true }) selectedMonth!: string;
  @Output() monthSelected = new EventEmitter<string>();

  pickerYear = signal<number>(new Date().getFullYear());
  readonly monthNames = MONTH_NAMES;

  present(): void {
    this.pickerYear.set(parseInt(this.selectedMonth.substring(0, 4), 10));
    this.modal.present();
  }

  dismiss(): void {
    this.modal.dismiss();
  }

  changePickerYear(delta: number): void {
    this.pickerYear.update(y => y + delta);
  }

  isMonthSelected(index: number): boolean {
    const selYear = parseInt(this.selectedMonth.substring(0, 4), 10);
    const selMonth = parseInt(this.selectedMonth.substring(5, 7), 10) - 1;
    return this.pickerYear() === selYear && index === selMonth;
  }

  selectMonth(index: number): void {
    const monthStr = (index + 1).toString().padStart(2, '0');
    this.monthSelected.emit(`${this.pickerYear()}-${monthStr}`);
    this.modal.dismiss();
  }

  selectThisMonth(): void {
    const now = new Date();
    this.pickerYear.set(now.getFullYear());
    const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
    this.monthSelected.emit(`${this.pickerYear()}-${monthStr}`);
    this.modal.dismiss();
  }
}

