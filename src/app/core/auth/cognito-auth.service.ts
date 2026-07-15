import { Injectable, computed, signal } from '@angular/core';
import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
} from 'aws-amplify/auth';
import { configureAmplifyAuth } from './amplify.config';
import { isCognitoConfigured } from '../../../environments/environment';

export type AuthMode = 'signIn' | 'confirm' | 'newPassword';

@Injectable({ providedIn: 'root' })
export class CognitoAuthService {
  private readonly readySignal = signal(false);
  private readonly authenticatedSignal = signal(false);
  private readonly emailSignal = signal<string | null>(null);
  private readonly configuredSignal = signal(false);

  readonly ready = this.readySignal.asReadonly();
  readonly authenticated = this.authenticatedSignal.asReadonly();
  readonly email = this.emailSignal.asReadonly();
  readonly configured = this.configuredSignal.asReadonly();
  readonly canShowApp = computed(() => this.readySignal() && this.authenticatedSignal());

  async init(): Promise<void> {
    const ok = configureAmplifyAuth();
    this.configuredSignal.set(ok);
    if (!ok) {
      this.authenticatedSignal.set(false);
      this.emailSignal.set(null);
      this.readySignal.set(true);
      return;
    }
    try {
      await fetchAuthSession();
      const user = await getCurrentUser();
      this.authenticatedSignal.set(true);
      this.emailSignal.set(user.signInDetails?.loginId ?? user.username);
    } catch {
      this.authenticatedSignal.set(false);
      this.emailSignal.set(null);
    }
    this.readySignal.set(true);
  }

  isConfigured(): boolean {
    return isCognitoConfigured();
  }

  /** @returns 'ok' | 'newPassword' | 'confirm' */
  async signIn(username: string, password: string): Promise<'ok' | 'newPassword' | 'confirm'> {
    this.ensureConfigured();
    // Sesiones a medias (cambio de contraseña, refresh, etc.) rompen el siguiente login.
    await this.clearLocalSession();

    const login = username.trim().toLowerCase();
    try {
      return await this.attemptSignIn(login, password, 'USER_SRP_AUTH');
    } catch (first) {
      if (this.isAlreadySignedIn(first)) {
        await this.clearLocalSession();
        return await this.attemptSignIn(login, password, 'USER_SRP_AUTH');
      }
      if (this.isAuthFlowDisabled(first)) {
        return await this.attemptSignIn(login, password, 'USER_PASSWORD_AUTH');
      }
      throw first;
    }
  }

  async completeNewPassword(newPassword: string): Promise<void> {
    this.ensureConfigured();
    const result = await confirmSignIn({ challengeResponse: newPassword });
    if (result.isSignedIn) {
      await this.refreshUser();
      return;
    }
    // Algunos pools piden un paso extra; si no quedó firmado, forzar sesión limpia.
    throw new Error(
      `Contraseña actualizada pero falta un paso (${result.nextStep.signInStep}). Cerrá sesión e iniciá con la contraseña NUEVA.`,
    );
  }

  async confirm(email: string, code: string): Promise<void> {
    this.ensureConfigured();
    await confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.trim() });
  }

  async resendCode(email: string): Promise<void> {
    this.ensureConfigured();
    await resendSignUpCode({ username: email.trim().toLowerCase() });
  }

  async signOut(): Promise<void> {
    if (!this.configuredSignal()) {
      return;
    }
    await this.clearLocalSession();
    this.authenticatedSignal.set(false);
    this.emailSignal.set(null);
  }

  private async attemptSignIn(
    username: string,
    password: string,
    authFlowType: 'USER_SRP_AUTH' | 'USER_PASSWORD_AUTH',
  ): Promise<'ok' | 'newPassword' | 'confirm'> {
    const result = await signIn({
      username,
      password,
      options: { authFlowType },
    });
    if (result.isSignedIn) {
      await this.refreshUser();
      return 'ok';
    }
    const step = result.nextStep.signInStep;
    if (step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return 'newPassword';
    }
    if (step === 'CONFIRM_SIGN_UP') {
      return 'confirm';
    }
    throw new Error(`Paso pendiente de Cognito: ${step}`);
  }

  private async clearLocalSession(): Promise<void> {
    try {
      await signOut({ global: false });
    } catch {
      // No había sesión local / tokens inválidos
    }
  }

  private async refreshUser(): Promise<void> {
    await fetchAuthSession({ forceRefresh: true });
    const user = await getCurrentUser();
    this.authenticatedSignal.set(true);
    this.emailSignal.set(user.signInDetails?.loginId ?? user.username);
  }

  private isAlreadySignedIn(e: unknown): boolean {
    const blob = this.errorBlob(e);
    return (
      blob.includes('UserAlreadyAuthenticatedException') ||
      blob.includes('already a signed in user') ||
      blob.includes('There is already a signed in user')
    );
  }

  private isAuthFlowDisabled(e: unknown): boolean {
    const blob = this.errorBlob(e);
    return blob.includes('USER_PASSWORD_AUTH') || blob.includes('Auth flow not enabled');
  }

  private errorBlob(e: unknown): string {
    if (!(e instanceof Error)) {
      return String(e);
    }
    const name = 'name' in e ? String((e as { name?: string }).name) : '';
    return `${name} ${e.message}`;
  }

  private ensureConfigured(): void {
    if (!configureAmplifyAuth()) {
      throw new Error('Cognito no está configurado. Editá src/environments/environment.ts');
    }
    this.configuredSignal.set(true);
  }
}
