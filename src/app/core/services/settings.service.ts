import { Injectable, inject, signal } from '@angular/core';
import {
  AppSettings,
  BikeTypeOption,
  MaintenanceTypeDefinition,
  RideTypeOption,
  ThemePreference,
} from '../models';
import { DatabaseService } from '../data/database.service';
import { nowIso } from '../utils/maintenance.util';
import { DEFAULT_MAINTENANCE_TYPES, REMOVED_MAINTENANCE_IDS } from '../defaults/catalog';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly db = inject(DatabaseService);
  private readonly settingsSignal = signal<AppSettings | null>(null);
  private readonly readySignal = signal(false);

  readonly settings = this.settingsSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  bikeTypes(): BikeTypeOption[] {
    return this.settingsSignal()?.bikeTypes ?? [];
  }

  rideTypes(): RideTypeOption[] {
    return this.settingsSignal()?.rideTypes ?? [];
  }

  maintenanceTypes(): MaintenanceTypeDefinition[] {
    return this.settingsSignal()?.maintenanceTypes ?? [];
  }

  theme(): ThemePreference {
    return this.settingsSignal()?.theme ?? 'system';
  }

  async init(): Promise<void> {
    const settings = await this.db.getSettings();
    const normalized = this.normalizeSettings(settings);
    if (JSON.stringify(normalized.maintenanceTypes) !== JSON.stringify(settings.maintenanceTypes)) {
      await this.db.saveSettings(normalized);
    }
    this.settingsSignal.set(normalized);
    this.readySignal.set(true);
    this.applyTheme(normalized.theme);
  }

  async update(partial: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
    const current = this.settingsSignal();
    if (!current) {
      return;
    }
    const next = this.normalizeSettings({
      ...current,
      ...partial,
      id: 'settings',
      updatedAt: nowIso(),
    });
    await this.db.saveSettings(next);
    this.settingsSignal.set(next);
    if (partial.theme) {
      this.applyTheme(partial.theme);
    }
  }

  applyTheme(theme: ThemePreference): void {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    if (theme === 'system') {
      root.style.colorScheme = 'light dark';
      root.removeAttribute('data-theme');
    } else {
      root.style.colorScheme = theme;
      root.setAttribute('data-theme', theme);
      root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    }
  }

  bikeTypeLabel(id: string): string {
    return this.bikeTypes().find((t) => t.id === id)?.label ?? id;
  }

  rideTypeLabel(id: string): string {
    return this.rideTypes().find((t) => t.id === id)?.label ?? id;
  }

  /** Alinea catálogo guardado con defaults (quita torque, flags hardtail, etc.). */
  private normalizeSettings(settings: AppSettings): AppSettings {
    return {
      ...settings,
      maintenanceTypes: this.mergeMaintenanceCatalog(settings.maintenanceTypes ?? []),
      updatedAt: nowIso(),
    };
  }

  private mergeMaintenanceCatalog(
    stored: MaintenanceTypeDefinition[],
  ): MaintenanceTypeDefinition[] {
    const byId = new Map(
      stored.filter((t) => !REMOVED_MAINTENANCE_IDS.has(t.id)).map((t) => [t.id, t]),
    );
    return DEFAULT_MAINTENANCE_TYPES.map((def) => {
      const existing = byId.get(def.id);
      if (!existing) {
        return structuredClone(def);
      }
      return {
        ...def,
        name: existing.name || def.name,
        intervalHours: existing.intervalHours > 0 ? existing.intervalHours : def.intervalHours,
        group: def.group,
      };
    });
  }
}
