import { Injectable } from '@angular/core';
import {
  AppSettings,
  BackupBike,
  BackupPayload,
  Bike,
  BikePhotoBackup,
  BikePhotoRecord,
  HistoryEntry,
  MaintenanceEvent,
  Ride,
} from '../models';
import {
  DEFAULT_BIKE_TYPES,
  DEFAULT_MAINTENANCE_TYPES,
  DEFAULT_RIDE_TYPES,
} from '../defaults/catalog';
import { createId, nowIso } from '../utils/maintenance.util';
import { blobToDataUrl, dataUrlToBlob } from '../utils/photo.util';
import { IndexedDbStore } from './indexed-db.store';

const DB_NAME = 'bikeSev';
/** v2: store `photos` con Blobs. v3 store `auth` queda ignorado (PIN removido). */
const DB_VERSION = 3;
const STORES = ['bikes', 'rides', 'maintenanceEvents', 'history', 'settings', 'photos', 'auth'] as const;

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly db = new IndexedDbStore(DB_NAME, DB_VERSION, [...STORES]);

  getBikes(): Promise<Bike[]> {
    return this.db.getAll<Bike>('bikes');
  }

  getBike(id: string): Promise<Bike | undefined> {
    return this.db.get<Bike>('bikes', id);
  }

  /** Persiste bici sin campos runtime de foto. */
  saveBike(bike: Bike): Promise<void> {
    const record = this.toPersistedBike(bike);
    return this.db.put('bikes', record);
  }

  async deleteBike(id: string): Promise<void> {
    await Promise.all([this.db.delete('bikes', id), this.deletePhoto(id)]);
  }

  getRides(): Promise<Ride[]> {
    return this.db.getAll<Ride>('rides');
  }

  saveRide(ride: Ride): Promise<void> {
    return this.db.put('rides', ride);
  }

  getMaintenanceEvents(): Promise<MaintenanceEvent[]> {
    return this.db.getAll<MaintenanceEvent>('maintenanceEvents');
  }

  saveMaintenanceEvent(event: MaintenanceEvent): Promise<void> {
    return this.db.put('maintenanceEvents', event);
  }

  getHistory(): Promise<HistoryEntry[]> {
    return this.db.getAll<HistoryEntry>('history');
  }

  saveHistory(entry: HistoryEntry): Promise<void> {
    return this.db.put('history', entry);
  }

  getPhotos(): Promise<BikePhotoRecord[]> {
    return this.db.getAll<BikePhotoRecord>('photos');
  }

  getPhoto(bikeId: string): Promise<BikePhotoRecord | undefined> {
    return this.db.get<BikePhotoRecord>('photos', bikeId);
  }

  savePhoto(bikeId: string, blob: Blob): Promise<void> {
    const record: BikePhotoRecord = {
      id: bikeId,
      bikeId,
      blob,
      mimeType: blob.type || 'image/jpeg',
      updatedAt: nowIso(),
    };
    return this.db.put('photos', record);
  }

  deletePhoto(bikeId: string): Promise<void> {
    return this.db.delete('photos', bikeId);
  }

  async getSettings(): Promise<AppSettings> {
    const existing = await this.db.get<AppSettings>('settings', 'settings');
    if (existing) {
      return existing;
    }
    const defaults = this.createDefaultSettings();
    await this.db.put('settings', defaults);
    return defaults;
  }

  saveSettings(settings: AppSettings): Promise<void> {
    return this.db.put('settings', { ...settings, id: 'settings' });
  }

  async exportBackup(): Promise<BackupPayload> {
    const [bikes, rides, maintenanceEvents, history, settings, photos] = await Promise.all([
      this.getBikes(),
      this.getRides(),
      this.getMaintenanceEvents(),
      this.getHistory(),
      this.getSettings(),
      this.getPhotos(),
    ]);

    const photoBackups: BikePhotoBackup[] = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        bikeId: p.bikeId,
        mimeType: p.mimeType,
        dataBase64: await blobToDataUrl(p.blob),
        updatedAt: p.updatedAt,
      })),
    );

    for (const bike of bikes) {
      if (bike.photoDataUrl && !photoBackups.some((p) => p.bikeId === bike.id)) {
        photoBackups.push({
          id: bike.id,
          bikeId: bike.id,
          mimeType: 'image/jpeg',
          dataBase64: bike.photoDataUrl,
          updatedAt: bike.updatedAt,
        });
      }
    }

    return {
      version: 2,
      exportedAt: nowIso(),
      bikes: bikes.map((b) => this.toPersistedBike({ ...b, hasPhoto: b.hasPhoto || !!b.photoDataUrl })),
      rides,
      maintenanceEvents,
      history,
      settings,
      photos: photoBackups,
    };
  }

  async importBackup(payload: BackupPayload): Promise<void> {
    if (payload.version !== 1 && payload.version !== 2 && payload.version !== 3) {
      throw new Error('Versión de respaldo no soportada');
    }
    if (!Array.isArray(payload.bikes) || !payload.settings) {
      throw new Error('Archivo de respaldo incompleto o inválido');
    }

    await this.db.clearAll();

    const bikes = (payload.bikes ?? []).map((b) => this.normalizeImportedBike(b));
    await Promise.all([
      this.db.putMany(
        'bikes',
        bikes.map((b) => this.toPersistedBike(b)),
      ),
      this.db.putMany('rides', payload.rides ?? []),
      this.db.putMany('maintenanceEvents', payload.maintenanceEvents ?? []),
      this.db.putMany('history', payload.history ?? []),
      this.db.put('settings', payload.settings ?? this.createDefaultSettings()),
    ]);

    for (const photo of payload.photos ?? []) {
      if (!photo?.dataBase64 || !photo.bikeId) {
        continue;
      }
      const blob = await dataUrlToBlob(photo.dataBase64);
      await this.savePhoto(photo.bikeId, blob);
    }

    for (const bike of payload.bikes ?? []) {
      const legacy = bike as BackupBike & { photoDataUrl?: string | null };
      if (legacy.photoDataUrl && !(payload.photos ?? []).some((p) => p.bikeId === bike.id)) {
        const blob = await dataUrlToBlob(legacy.photoDataUrl);
        await this.savePhoto(bike.id, blob);
        await this.saveBike({ ...this.normalizeImportedBike(bike), hasPhoto: true });
      }
    }
  }

  private toPersistedBike(bike: Bike): BackupBike {
    return {
      id: bike.id,
      hasPhoto: !!bike.hasPhoto,
      name: bike.name,
      brand: bike.brand,
      model: bike.model,
      year: bike.year,
      size: bike.size,
      typeId: bike.typeId,
      suspensionLayout: bike.suspensionLayout,
      color: bike.color,
      weightKg: bike.weightKg,
      purchaseDate: bike.purchaseDate,
      initialKm: bike.initialKm,
      initialHours: bike.initialHours,
      totalHours: bike.totalHours,
      totalKm: bike.totalKm,
      lastUsedAt: bike.lastUsedAt,
      createdAt: bike.createdAt,
      updatedAt: bike.updatedAt,
      maintenance: bike.maintenance,
    };
  }

  private normalizeImportedBike(bike: BackupBike): Bike {
    const legacy = bike as BackupBike & { photoDataUrl?: string | null };
    return {
      ...bike,
      hasPhoto: !!bike.hasPhoto || !!legacy.photoDataUrl,
      suspensionLayout: bike.suspensionLayout ?? 'full',
      maintenance: bike.maintenance ?? [],
    };
  }

  private createDefaultSettings(): AppSettings {
    return {
      id: 'settings',
      bikeTypes: structuredClone(DEFAULT_BIKE_TYPES),
      rideTypes: structuredClone(DEFAULT_RIDE_TYPES),
      maintenanceTypes: structuredClone(DEFAULT_MAINTENANCE_TYPES),
      theme: 'system',
      updatedAt: nowIso(),
    };
  }
}

export { createId };
