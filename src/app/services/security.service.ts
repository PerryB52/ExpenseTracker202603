import { Injectable, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { DatabaseService } from './database.service';

export interface NativeSecurityPlugin {
  setPrivacyScreen(options: { enabled: boolean }): Promise<void>;
  isDeviceSecure(): Promise<{ secure: boolean }>;
  authenticateDevice(options: {
    title?: string;
    description?: string;
  }): Promise<{ authenticated: boolean }>;
}

const NativeSecurity = registerPlugin<NativeSecurityPlugin>('NativeSecurity');
const PIN_HASH_SALT = 'expensetracker_pin_v1_salt_';
const LOCK_CACHE_KEY = 'expensetracker_app_lock_enabled';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private appLockEnabledSignal = signal<boolean>(false);
  readonly isAppLockEnabled = this.appLockEnabledSignal.asReadonly();

  private biometricEnabledSignal = signal<boolean>(false);
  readonly isBiometricEnabled = this.biometricEnabledSignal.asReadonly();

  private privacyScreenEnabledSignal = signal<boolean>(false);
  readonly isPrivacyScreenEnabled = this.privacyScreenEnabledSignal.asReadonly();

  private isLockedSignal = signal<boolean>(false);
  readonly isLocked = this.isLockedSignal.asReadonly();

  private isBackgroundedSignal = signal<boolean>(false);
  readonly isBackgrounded = this.isBackgroundedSignal.asReadonly();

  private pinHash: string | null = null;
  private webAuthnCredId: string | null = null;
  private isPromptingNativeAuth = false;
  private backgroundTimestamp: number | null = null;

  constructor(private dbService: DatabaseService) {
    this.initSecurity();
    this.setupLifecycleListeners();
  }

  private async initSecurity(): Promise<void> {
    // 1. Immediate lock check from localStorage to prevent flash of unlocked content
    if (localStorage.getItem(LOCK_CACHE_KEY) === 'true') {
      this.appLockEnabledSignal.set(true);
      this.isLockedSignal.set(true);
    }

    // 2. Load authoritative settings from SQLite
    try {
      const db = this.dbService.getDb();
      if (!db) return;

      const pinHash = await this.getSetting(db, 'security_pin_hash');
      const lockEnabled = (await this.getSetting(db, 'security_app_lock')) === 'true' && !!pinHash;
      const bioEnabled = (await this.getSetting(db, 'security_biometric')) === 'true';
      const privacyEnabled = (await this.getSetting(db, 'security_privacy_screen')) === 'true';
      const webCredId = await this.getSetting(db, 'security_webauthn_cred_id');

      this.pinHash = pinHash;
      this.webAuthnCredId = webCredId;
      this.appLockEnabledSignal.set(lockEnabled);
      this.biometricEnabledSignal.set(bioEnabled);
      this.privacyScreenEnabledSignal.set(privacyEnabled);

      localStorage.setItem(LOCK_CACHE_KEY, lockEnabled ? 'true' : 'false');
      this.isLockedSignal.set(lockEnabled);

      if (privacyEnabled) {
        await this.applyNativePrivacyScreen(true);
      }
    } catch (e) {
      console.error('Failed to initialize SecurityService', e);
    }
  }

  private setupLifecycleListeners(): void {
    App.addListener('appStateChange', ({ isActive }) => {
      if (this.isPromptingNativeAuth) {
        return;
      }

      if (!isActive) {
        this.isBackgroundedSignal.set(true);
        this.backgroundTimestamp = Date.now();
      } else {
        this.isBackgroundedSignal.set(false);
        if (
          this.appLockEnabledSignal() &&
          this.backgroundTimestamp &&
          Date.now() - this.backgroundTimestamp > 2000
        ) {
          this.isLockedSignal.set(true);
        }
        this.backgroundTimestamp = null;
      }
    });
  }

  async enableAppLock(pin: string): Promise<void> {
    const hash = await this.hashPin(pin);
    this.pinHash = hash;
    this.appLockEnabledSignal.set(true);
    localStorage.setItem(LOCK_CACHE_KEY, 'true');

    await this.saveSetting('security_pin_hash', hash);
    await this.saveSetting('security_app_lock', 'true');
  }

  async disableAppLock(): Promise<void> {
    this.appLockEnabledSignal.set(false);
    this.biometricEnabledSignal.set(false);
    this.isLockedSignal.set(false);
    this.pinHash = null;
    localStorage.setItem(LOCK_CACHE_KEY, 'false');

    await this.saveSetting('security_app_lock', 'false');
    await this.saveSetting('security_biometric', 'false');
    await this.saveSetting('security_pin_hash', '');
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (!this.pinHash) return false;
    const candidateHash = await this.hashPin(pin);
    if (candidateHash === this.pinHash) {
      this.isLockedSignal.set(false);
      return true;
    }
    return false;
  }

  lockNow(): void {
    if (this.appLockEnabledSignal()) {
      this.isLockedSignal.set(true);
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<boolean> {
    if (!enabled) {
      this.biometricEnabledSignal.set(false);
      await this.saveSetting('security_biometric', 'false');
      return true;
    }

    if (Capacitor.getPlatform() === 'android') {
      try {
        const { secure } = await NativeSecurity.isDeviceSecure();
        if (!secure) {
          return false;
        }
        this.biometricEnabledSignal.set(true);
        await this.saveSetting('security_biometric', 'true');
        return true;
      } catch {
        return false;
      }
    }

    // Web platform authenticator fallback via WebAuthn
    const enrolled = await this.enrollWebBiometrics();
    if (enrolled) {
      this.biometricEnabledSignal.set(true);
      await this.saveSetting('security_biometric', 'true');
      return true;
    }
    return false;
  }

  async promptBiometricUnlock(): Promise<boolean> {
    if (!this.biometricEnabledSignal()) return false;

    if (Capacitor.getPlatform() === 'android') {
      try {
        this.isPromptingNativeAuth = true;
        const res = await NativeSecurity.authenticateDevice({
          title: 'Unlock Expense Tracker',
          description: 'Use your fingerprint, face, or device credential',
        });
        this.isPromptingNativeAuth = false;
        if (res.authenticated) {
          this.isLockedSignal.set(false);
          return true;
        }
      } catch (e) {
        this.isPromptingNativeAuth = false;
        console.warn('Biometric authentication cancelled or unavailable', e);
      }
      return false;
    }

    // Web platform authenticator verification
    const verified = await this.verifyWebBiometrics();
    if (verified) {
      this.isLockedSignal.set(false);
      return true;
    }
    return false;
  }

  async setPrivacyScreenEnabled(enabled: boolean): Promise<void> {
    this.privacyScreenEnabledSignal.set(enabled);
    await this.saveSetting('security_privacy_screen', enabled ? 'true' : 'false');
    await this.applyNativePrivacyScreen(enabled);
  }

  private async applyNativePrivacyScreen(enabled: boolean): Promise<void> {
    if (Capacitor.getPlatform() === 'android') {
      try {
        await NativeSecurity.setPrivacyScreen({ enabled });
      } catch (e) {
        console.warn('Unable to toggle native FLAG_SECURE', e);
      }
    }
  }

  private async hashPin(pin: string): Promise<string> {
    const data = new TextEncoder().encode(PIN_HASH_SALT + pin);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback simple hash if subtle crypto is unavailable in non-secure context
    let h = 2166136261;
    for (let i = 0; i < data.length; i++) {
      h ^= data[i];
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  private async enrollWebBiometrics(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) return false;
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) return false;

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'Expense Tracker' },
          user: {
            id: userId,
            name: 'local-user',
            displayName: 'Expense Tracker User',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 30000,
        },
      })) as PublicKeyCredential | null;

      if (cred) {
        const b64Id = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        this.webAuthnCredId = b64Id;
        await this.saveSetting('security_webauthn_cred_id', b64Id);
        return true;
      }
    } catch (e) {
      console.warn('WebAuthn enrollment failed or cancelled', e);
    }
    return false;
  }

  private async verifyWebBiometrics(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential || !navigator.credentials || !this.webAuthnCredId) {
        return false;
      }
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const rawId = Uint8Array.from(atob(this.webAuthnCredId), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: rawId }],
          userVerification: 'required',
          timeout: 30000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  }

  private async getSetting(db: any, key: string): Promise<string | null> {
    const res = await db.query('SELECT value FROM settings WHERE key = ?', [key]);
    return res.values && res.values.length > 0 ? res.values[0].value : null;
  }

  private async saveSetting(key: string, value: string): Promise<void> {
    try {
      const db = this.dbService.getDb();
      if (!db) return;
      await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
      await this.dbService.saveStore();
    } catch (e) {
      console.error(`Failed to save setting ${key}`, e);
    }
  }
}

