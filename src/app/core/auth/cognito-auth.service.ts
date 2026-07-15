import { Injectable, computed, signal } from '@angular/core';
import {
  confirmSignIn,
  confirmSignUp,
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
    const result = await signIn({
      username: username.trim(),
      password,
      options: { authFlowType: 'USER_SRP_AUTH' },
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

  async completeNewPassword(newPassword: string): Promise<void> {
    this.ensureConfigured();
    const result = await confirmSignIn({ challengeResponse: newPassword });
    if (!result.isSignedIn) {
      throw new Error('No se pudo confirmar la contraseña nueva');
    }
    await this.refreshUser();
  }

  async confirm(email: string, code: string): Promise<void> {
    this.ensureConfigured();
    await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
  }

  async resendCode(email: string): Promise<void> {
    this.ensureConfigured();
    await resendSignUpCode({ username: email.trim() });
  }

  async signOut(): Promise<void> {
    if (!this.configuredSignal()) {
      return;
    }
    await signOut();
    this.authenticatedSignal.set(false);
    this.emailSignal.set(null);
  }

  private async refreshUser(): Promise<void> {
    const user = await getCurrentUser();
    this.authenticatedSignal.set(true);
    this.emailSignal.set(user.signInDetails?.loginId ?? user.username);
  }

  private ensureConfigured(): void {
    if (!configureAmplifyAuth()) {
      throw new Error('Cognito no está configurado. Editá src/environments/environment.ts');
    }
    this.configuredSignal.set(true);
  }
}
