import { Component } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { SecurityService } from './services/security.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    private themeService: ThemeService,
    private securityService: SecurityService
  ) {}
}
