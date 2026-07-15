import { Injectable, inject } from '@angular/core';
import { BackupPayload } from '../models';
import { DatabaseService } from '../data/database.service';
import { BikeStore } from './bike.store';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly db = inject(DatabaseService);
  private readonly bikes = inject(BikeStore);
  private readonly settings = inject(SettingsService);

  async exportJson(): Promise<void> {
    const payload = await this.db.exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bikesev-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importJson(file: File): Promise<void> {
    const text = await file.text();
    let payload: BackupPayload;
    try {
      payload = JSON.parse(text) as BackupPayload;
    } catch {
      throw new Error('El archivo no es un JSON válido');
    }
    if (payload.version !== 1 && payload.version !== 2 && payload.version !== 3) {
      throw new Error('Versión de respaldo no soportada');
    }
    await this.db.importBackup(payload);
    await this.settings.init();
    await this.bikes.reloadFromDb();
  }
}
