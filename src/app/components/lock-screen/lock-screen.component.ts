import { Component, effect, signal } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SecurityService } from '../../services/security.service';

@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss'],
  standalone: false,
})
export class LockScreenComponent {
  enteredPin = signal<string>('');
  hasError = signal<boolean>(false);
  readonly pinDots = [0, 1, 2, 3];
  readonly keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  private hasAutoPromptedBio = false;

  constructor(public securityService: SecurityService) {
    effect(() => {
      const locked = this.securityService.isLocked();
      if (locked) {
        this.enteredPin.set('');
        this.hasError.set(false);
        if (this.securityService.isBiometricEnabled() && !this.hasAutoPromptedBio) {
          this.hasAutoPromptedBio = true;
          setTimeout(() => this.triggerBiometric(), 250);
        }
      } else {
        this.hasAutoPromptedBio = false;
      }
    });
  }

  async onDigitPress(digit: string): Promise<void> {
    if (this.enteredPin().length >= 4) return;

    this.hasError.set(false);
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics optional on web
    }

    const updated = this.enteredPin() + digit;
    this.enteredPin.set(updated);

    if (updated.length === 4) {
      const valid = await this.securityService.verifyPin(updated);
      if (!valid) {
        this.hasError.set(true);
        try {
          await Haptics.notification({ type: NotificationType.Error });
        } catch {
          // Haptics optional on web
        }
        setTimeout(() => {
          this.enteredPin.set('');
        }, 380);
      }
    }
  }

  onBackspace(): void {
    const cur = this.enteredPin();
    if (cur.length > 0) {
      this.enteredPin.set(cur.slice(0, -1));
      this.hasError.set(false);
    }
  }

  async triggerBiometric(): Promise<void> {
    await this.securityService.promptBiometricUnlock();
  }
}

