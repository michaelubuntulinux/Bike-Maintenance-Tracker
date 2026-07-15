import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthMode, CognitoAuthService } from '../../../core/auth/cognito-auth.service';

@Component({
  selector: 'app-auth-gate',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './auth-gate.html',
  styleUrl: './auth-gate.scss',
})
export class AuthGateComponent {
  private readonly auth = inject(CognitoAuthService);

  readonly configured = this.auth.configured;
  readonly mode = signal<AuthMode>('signIn');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly code = signal('');
  readonly error = signal('');
  readonly info = signal('');
  readonly busy = signal(false);

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
    this.info.set('');
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.error.set('');
    this.info.set('');
    this.busy.set(true);
    try {
      const email = this.email().trim();
      const password = this.password();
      if (!email || !password) {
        throw new Error('Email y contraseña son obligatorios');
      }

      if (this.mode() === 'signIn') {
        try {
          await this.auth.signIn(email, password);
        } catch (e) {
          if (e instanceof Error && e.message === 'CONFIRM_SIGN_UP') {
            this.mode.set('confirm');
            this.info.set('Confirmá tu email con el código que te enviamos.');
            return;
          }
          throw e;
        }
      } else if (this.mode() === 'signUp') {
        if (password !== this.confirmPassword()) {
          throw new Error('Las contraseñas no coinciden');
        }
        if (password.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        const next = await this.auth.signUp(email, password);
        if (next === 'confirm') {
          this.mode.set('confirm');
          this.info.set('Te enviamos un código de verificación al email.');
        }
      } else {
        if (!this.code().trim()) {
          throw new Error('Ingresá el código de verificación');
        }
        await this.auth.confirm(email, this.code());
        await this.auth.signIn(email, password);
      }
    } catch (e) {
      this.error.set(this.mapError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.resendCode(this.email());
      this.info.set('Código reenviado.');
    } catch (e) {
      this.error.set(this.mapError(e));
    }
  }

  private mapError(e: unknown): string {
    if (!(e instanceof Error)) {
      return 'Error de autenticación';
    }
    const msg = e.message || '';
    if (msg.includes('UserAlreadyExistsException') || msg.includes('UsernameExistsException')) {
      return 'Ese email ya está registrado. Iniciá sesión.';
    }
    if (msg.includes('NotAuthorizedException') || msg.includes('Incorrect username or password')) {
      return 'Email o contraseña incorrectos';
    }
    if (msg.includes('UserNotConfirmedException') || msg === 'CONFIRM_SIGN_UP') {
      return 'Debés confirmar tu email antes de entrar.';
    }
    if (msg.includes('CodeMismatchException')) {
      return 'Código inválido';
    }
    if (msg.includes('InvalidPasswordException')) {
      return 'La contraseña no cumple la política de Cognito';
    }
    if (msg.includes('Cognito no está configurado')) {
      return msg;
    }
    return msg.length > 140 ? 'No se pudo autenticar. Revisá credenciales y configuración.' : msg;
  }
}
