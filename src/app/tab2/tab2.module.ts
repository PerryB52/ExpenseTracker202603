import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';
import { Tab2PageRoutingModule } from './tab2-routing.module';
import { MonthPickerModalModule } from '../components/month-picker-modal/month-picker-modal.module';
import { SwipeNavigationDirective } from '../directives/swipe-navigation.directive';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    MonthPickerModalModule,
    Tab2PageRoutingModule,
    SwipeNavigationDirective,
  ],
  declarations: [Tab2Page],
})
export class Tab2PageModule {}
