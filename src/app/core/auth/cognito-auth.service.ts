import { Injectable, computed, signal } from '@angular/core';
import {
  confirmSignUp,
  getCurrentUser,
  resendSignUpCode,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { configureAmplifyAuth } from './amplify.config';
import { isCognitoConfigured } from '../../../environments/environment';

export type AuthMode = 'signIn' | 'signUp' | 'confirm';

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

  async signIn(email: string, password: string): Promise<void> {
    this.ensureConfigured();
    const result = await signIn({ username: email.trim(), password });
    if (result.isSignedIn) {
      await this.refreshUser();
      return;
    }
    if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
      throw new Error('CONFIRM_SIGN_UP');
    }
    throw new Error('No se pudo iniciar sesión. Completá el paso pendiente en Cognito.');
  }

  async signUp(email: string, password: string): Promise<'done' | 'confirm'> {
    this.ensureConfigured();
    const result = await signUp({
      username: email.trim(),
      password,
      options: {
        userAttributes: { email: email.trim() },
      },
    });
    if (result.isSignUpComplete) {
      await this.signIn(email, password);
      return 'done';
    }
    if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
      return 'confirm';
    }
    return 'confirm';
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
