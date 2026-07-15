import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthMode, CognitoAuthService } from '../../../core/auth/cognito-auth.service';

@Component({
  selector: 'app-auth-gate',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './auth-gate.html',
  styleUrl: './auth-gate.scss',
})
export class AuthGateComponent {
  private readonly auth = inject(CognitoAuthService);

  readonly configured = this.auth.configured;
  readonly mode = signal<AuthMode>('signIn');
  readonly username = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly newPassword = signal('');
  readonly code = signal('');
  readonly error = signal('');
  readonly info = signal('');
  readonly busy = signal(false);

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.error.set('');
    this.info.set('');
    this.busy.set(true);
    try {
      const username = this.username().trim();
      const password = this.password();

      if (this.mode() === 'newPassword') {
        const next = this.newPassword();
        if (next.length < 8) {
          throw new Error('La contraseña nueva debe tener al menos 8 caracteres');
        }
        if (next !== this.confirmPassword()) {
          throw new Error('Las contraseñas no coinciden');
        }
        await this.auth.completeNewPassword(next);
        return;
      }

      if (!username || !password) {
        throw new Error('Usuario y contraseña son obligatorios');
      }

      if (this.mode() === 'signIn') {
        const next = await this.auth.signIn(username, password);
        if (next === 'newPassword') {
          this.mode.set('newPassword');
          this.confirmPassword.set('');
          this.newPassword.set('');
          this.info.set('Cognito pide una contraseña permanente. Elegí una nueva.');
          return;
        }
        if (next === 'confirm') {
          this.mode.set('confirm');
          this.info.set('Confirmá tu email con el código que te enviamos.');
        }
        return;
      }

      if (!this.code().trim()) {
        throw new Error('Ingresá el código de verificación');
      }
      await this.auth.confirm(username, this.code());
      await this.auth.signIn(username, password);
    } catch (e) {
      console.error('[bikeSev auth]', e);
      this.error.set(this.mapError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async resend(): Promise<void> {
    this.error.set('');
    try {
      await this.auth.resendCode(this.username());
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
    const name = 'name' in e ? String((e as { name?: string }).name) : '';
    const blob = `${name} ${msg}`;

    if (blob.includes('NotAuthorizedException') || blob.includes('Incorrect username or password')) {
      return 'Usuario o contraseña incorrectos. Si ya cambiaste la contraseña en bikeSev, usá la NUEVA permanente (no la temporal que pusiste al crear el usuario).';
    }
    if (blob.includes('UserNotFoundException')) {
      return 'Usuario no encontrado. Creá el usuario en Cognito → Usuarios.';
    }
    if (blob.includes('PasswordResetRequiredException')) {
      return 'Debés restablecer la contraseña desde la consola de Cognito.';
    }
    if (blob.includes('UserNotConfirmedException') || msg === 'CONFIRM_SIGN_UP') {
      return 'Debés confirmar tu email antes de entrar.';
    }
    if (blob.includes('CodeMismatchException')) {
      return 'Código inválido';
    }
    if (blob.includes('InvalidPasswordException')) {
      return 'La contraseña no cumple la política de Cognito';
    }
    if (blob.includes('USER_PASSWORD_AUTH') || blob.includes('Auth flow not enabled')) {
      return 'El App client no tiene el flujo SRP habilitado. En Cognito → App client → Authentication flows, activá ALLOW_USER_SRP_AUTH.';
    }
    if (msg.includes('Cognito no está configurado')) {
      return msg;
    }
    return msg.length > 160 ? 'No se pudo autenticar. Revisá usuario, contraseña y App client.' : msg;
  }
}
