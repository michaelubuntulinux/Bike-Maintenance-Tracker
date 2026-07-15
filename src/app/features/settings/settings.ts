import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '../../core/services/settings.service';
import { BackupService } from '../../core/services/backup.service';
import { BikeStore } from '../../core/services/bike.store';
import { CognitoAuthService } from '../../core/auth/cognito-auth.service';
import {
  BikeTypeOption,
  MaintenanceGroupId,
  MaintenanceTypeDefinition,
  RideTypeOption,
  ThemePreference,
} from '../../core/models';
import { createId } from '../../core/data/database.service';
import { MAINTENANCE_GROUPS } from '../../core/defaults/catalog';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatIconModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  private readonly settings = inject(SettingsService);
  private readonly backup = inject(BackupService);
  private readonly bikes = inject(BikeStore);
  private readonly auth = inject(CognitoAuthService);
  private readonly snack = inject(MatSnackBar);

  readonly userEmail = this.auth.email;
  readonly theme = signal<ThemePreference>(this.settings.theme());
  readonly bikeTypes = signal<BikeTypeOption[]>(structuredClone(this.settings.bikeTypes()));
  readonly rideTypes = signal<RideTypeOption[]>(structuredClone(this.settings.rideTypes()));
  readonly maintenanceTypes = signal<MaintenanceTypeDefinition[]>(
    structuredClone(this.settings.maintenanceTypes()),
  );
  readonly maintenanceGroups = MAINTENANCE_GROUPS;

  typesInGroup(groupId: MaintenanceGroupId): MaintenanceTypeDefinition[] {
    return this.maintenanceTypes().filter((m) => m.group === groupId);
  }

  async signOut(): Promise<void> {
    this.bikes.clearSession();
    await this.auth.signOut();
  }

  async saveTheme(): Promise<void> {
    await this.settings.update({ theme: this.theme() });
    this.snack.open('Tema actualizado', 'OK', { duration: 2000 });
  }

  async saveCatalogs(): Promise<void> {
    await this.settings.update({
      bikeTypes: this.bikeTypes(),
      rideTypes: this.rideTypes(),
      maintenanceTypes: this.maintenanceTypes(),
    });
    this.snack.open('Configuración guardada', 'OK', { duration: 2000 });
  }

  addBikeType(): void {
    this.bikeTypes.update((list) => [...list, { id: createId(), label: 'Nuevo tipo' }]);
  }

  removeBikeType(id: string): void {
    this.bikeTypes.update((list) => list.filter((t) => t.id !== id));
  }

  addRideType(): void {
    this.rideTypes.update((list) => [...list, { id: createId(), label: 'Nueva salida' }]);
  }

  removeRideType(id: string): void {
    this.rideTypes.update((list) => list.filter((t) => t.id !== id));
  }

  updateInterval(id: string, value: string): void {
    const hours = Number(value);
    this.maintenanceTypes.update((list) =>
      list.map((t) => (t.id === id ? { ...t, intervalHours: hours } : t)),
    );
  }

  async exportBackup(): Promise<void> {
    await this.backup.exportJson();
    this.snack.open('Respaldo exportado', 'OK', { duration: 2000 });
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      await this.backup.importJson(file);
      this.theme.set(this.settings.theme());
      this.bikeTypes.set(structuredClone(this.settings.bikeTypes()));
      this.rideTypes.set(structuredClone(this.settings.rideTypes()));
      this.maintenanceTypes.set(structuredClone(this.settings.maintenanceTypes()));
      this.snack.open('Respaldo restaurado', 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open(e instanceof Error ? e.message : 'Importación fallida', 'OK', {
        duration: 3500,
      });
    } finally {
      input.value = '';
    }
  }
}
