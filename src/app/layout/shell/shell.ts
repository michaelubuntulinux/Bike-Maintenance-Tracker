import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BikeStore } from '../../core/services/bike.store';
import { SettingsService } from '../../core/services/settings.service';
import { CognitoAuthService } from '../../core/auth/cognito-auth.service';
import { AuthGateComponent } from '../../features/auth/auth-gate/auth-gate';
import { BrandMarkComponent } from '../../shared/brand-mark/brand-mark';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuthGateComponent,
    BrandMarkComponent,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  private readonly bikes = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(CognitoAuthService);

  readonly authReady = this.auth.ready;
  readonly authenticated = this.auth.authenticated;
  readonly dataReady = this.bikes.ready;
  readonly userEmail = this.auth.email;
  private readonly loadingData = signal(false);

  constructor() {
    void this.auth.init();

    effect(() => {
      if (this.auth.canShowApp() && !this.bikes.ready() && !this.loadingData()) {
        this.loadingData.set(true);
        void this.bikes.init().finally(() => this.loadingData.set(false));
      }
    });
  }

  toggleTheme(): void {
    const current = this.settings.theme();
    const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
    void this.settings.update({ theme: next });
  }

  async signOut(): Promise<void> {
    this.bikes.clearSession();
    await this.auth.signOut();
  }
}
