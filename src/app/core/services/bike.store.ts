import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AlertLevel,
  Bike,
  HistoryEntry,
  MaintenanceCounter,
  MaintenanceEvent,
  Ride,
  MaintenanceTypeDefinition,
} from '../models';
import { DatabaseService, createId } from '../data/database.service';
import { SettingsService } from './settings.service';
import {
  alertLevel,
  counterInterval,
  ensureCounters,
  normalizeSuspensionLayout,
  nowIso,
} from '../utils/maintenance.util';
import { dataUrlToBlob, revokeUrl } from '../utils/photo.util';

@Injectable({ providedIn: 'root' })
export class BikeStore {
  private readonly db = inject(DatabaseService);
  private readonly settings = inject(SettingsService);

  private readonly bikesSignal = signal<Bike[]>([]);
  private readonly historySignal = signal<HistoryEntry[]>([]);
  private readonly readySignal = signal(false);

  readonly bikes = this.bikesSignal.asReadonly();
  readonly history = this.historySignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();

  readonly bikeCount = computed(() => this.bikesSignal().length);

  async init(): Promise<void> {
    await this.settings.init();
    const [bikes, history, photos] = await Promise.all([
      this.db.getBikes(),
      this.db.getHistory(),
      this.db.getPhotos(),
    ]);
    const types = this.settings.maintenanceTypes();
    const photoUrlById = new Map<string, string>();
    for (const photo of photos) {
      photoUrlById.set(photo.bikeId, URL.createObjectURL(photo.blob));
    }

    const normalized: Bike[] = [];
    const toPersist: Bike[] = [];

    for (const raw of bikes) {
      const layout = normalizeSuspensionLayout(raw.suspensionLayout);
      let hasPhoto = !!raw.hasPhoto || !!raw.photoDataUrl || photoUrlById.has(raw.id);
      let photoUrl = photoUrlById.get(raw.id) ?? null;

      // Migrar data URL legacy → Blob en IndexedDB
      if (raw.photoDataUrl && !photoUrlById.has(raw.id)) {
        try {
          const blob = await dataUrlToBlob(raw.photoDataUrl);
          await this.db.savePhoto(raw.id, blob);
          photoUrl = URL.createObjectURL(blob);
          hasPhoto = true;
          photoUrlById.set(raw.id, photoUrl);
        } catch {
          hasPhoto = false;
        }
      }

      const bike: Bike = {
        ...raw,
        hasPhoto,
        photoUrl,
        photoDataUrl: undefined,
        suspensionLayout: layout,
        maintenance: ensureCounters(raw.maintenance, types, layout),
      };

      const needsPersist =
        raw.hasPhoto !== hasPhoto ||
        !!raw.photoDataUrl ||
        raw.suspensionLayout !== layout ||
        raw.maintenance.length !== bike.maintenance.length ||
        raw.maintenance.some(
          (c) =>
            c.intervalHours == null ||
            c.intervalHours <= 0 ||
            c.totalUsageHours == null ||
            !bike.maintenance.some((n) => n.typeId === c.typeId),
        );

      if (needsPersist) {
        toPersist.push(bike);
      }
      normalized.push(bike);
    }

    if (toPersist.length) {
      await Promise.all(toPersist.map((b) => this.db.saveBike(b)));
    }

    this.revokeAllPhotoUrls();
    this.bikesSignal.set(normalized.sort((a, b) => a.name.localeCompare(b.name)));
    this.historySignal.set(
      history.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    );
    this.readySignal.set(true);
  }

  bikeById(id: string): Bike | undefined {
    return this.bikesSignal().find((b) => b.id === id);
  }

  historyForBike(bikeId: string): HistoryEntry[] {
    return this.historySignal().filter((h) => h.bikeId === bikeId);
  }

  maintenanceAlert(bike: Bike, typeId: string): AlertLevel {
    const counter = bike.maintenance.find((m) => m.typeId === typeId);
    const def = this.settings.maintenanceTypes().find((t) => t.id === typeId);
    if (!counter || !def) {
      return 'ok';
    }
    return alertLevel(counter.hoursSinceLast, counterInterval(counter, def));
  }

  async saveBike(
    input: Omit<
      Bike,
      'id' | 'createdAt' | 'updatedAt' | 'maintenance' | 'totalHours' | 'totalKm' | 'lastUsedAt' | 'photoUrl'
    > & {
      id?: string;
      totalHours?: number;
      totalKm?: number;
      lastUsedAt?: string | null;
      maintenance?: MaintenanceCounter[];
      /** Blob de foto nueva; null = quitar foto; undefined = no cambiar */
      photoBlob?: Blob | null;
    },
  ): Promise<Bike> {
    const types = this.settings.maintenanceTypes();
    const existing = input.id ? this.bikeById(input.id) : undefined;
    const layout = normalizeSuspensionLayout(input.suspensionLayout);
    const now = nowIso();
    const id = existing?.id ?? createId();

    let hasPhoto = existing?.hasPhoto ?? false;
    let photoUrl = existing?.photoUrl ?? null;

    if (input.photoBlob === null) {
      await this.db.deletePhoto(id);
      revokeUrl(photoUrl);
      hasPhoto = false;
      photoUrl = null;
    } else if (input.photoBlob instanceof Blob) {
      await this.db.savePhoto(id, input.photoBlob);
      revokeUrl(photoUrl);
      photoUrl = URL.createObjectURL(input.photoBlob);
      hasPhoto = true;
    }

    const bike: Bike = {
      id,
      hasPhoto,
      photoUrl,
      name: input.name.trim(),
      brand: input.brand.trim(),
      model: input.model.trim(),
      year: input.year,
      size: input.size.trim(),
      typeId: input.typeId,
      suspensionLayout: layout,
      color: input.color.trim(),
      weightKg: input.weightKg,
      purchaseDate: input.purchaseDate,
      initialKm: input.initialKm,
      initialHours: input.initialHours,
      totalHours: existing?.totalHours ?? input.totalHours ?? input.initialHours,
      totalKm: existing?.totalKm ?? input.totalKm ?? (input.initialKm ?? 0),
      lastUsedAt: existing?.lastUsedAt ?? input.lastUsedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      maintenance: ensureCounters(existing?.maintenance ?? input.maintenance, types, layout),
    };

    if (!existing) {
      bike.totalHours = input.initialHours;
      bike.totalKm = input.initialKm ?? 0;
      bike.maintenance = ensureCounters(
        types.map((t) => ({
          typeId: t.id,
          hoursSinceLast: input.initialHours,
          totalUsageHours: input.initialHours,
          lastPerformedAt: null,
          notes: '',
          intervalHours: t.intervalHours,
        })),
        types,
        layout,
      );
    }

    await this.db.saveBike(bike);
    this.upsertBikeLocal(bike);
    return bike;
  }

  async deleteBike(id: string): Promise<void> {
    const existing = this.bikeById(id);
    revokeUrl(existing?.photoUrl);
    await this.db.deleteBike(id);
    this.bikesSignal.update((list) => list.filter((b) => b.id !== id));
    this.historySignal.update((list) => list.filter((h) => h.bikeId !== id));
  }

  async registerRide(input: {
    bikeId: string;
    date: string;
    hours: number;
    kilometers: number | null;
    comments: string;
    rideTypeId: string;
  }): Promise<void> {
    const bike = this.bikeById(input.bikeId);
    if (!bike) {
      throw new Error('Bicicleta no encontrada');
    }

    const ride: Ride = {
      id: createId(),
      bikeId: input.bikeId,
      date: input.date,
      hours: input.hours,
      kilometers: input.kilometers,
      comments: input.comments.trim(),
      rideTypeId: input.rideTypeId,
      createdAt: nowIso(),
    };

    const updated: Bike = {
      ...bike,
      totalHours: +(bike.totalHours + input.hours).toFixed(2),
      totalKm: +(bike.totalKm + (input.kilometers ?? 0)).toFixed(2),
      lastUsedAt: input.date,
      updatedAt: nowIso(),
      maintenance: bike.maintenance.map((m) => ({
        ...m,
        hoursSinceLast: +(m.hoursSinceLast + input.hours).toFixed(2),
        totalUsageHours: +(m.totalUsageHours + input.hours).toFixed(2),
      })),
    };

    const rideType =
      this.settings.rideTypes().find((r) => r.id === input.rideTypeId)?.label ?? input.rideTypeId;

    const history: HistoryEntry = {
      id: createId(),
      bikeId: bike.id,
      kind: 'ride',
      date: input.date,
      title: `Salida ${rideType}`,
      description: `${input.hours} h` + (input.kilometers != null ? ` · ${input.kilometers} km` : ''),
      hours: input.hours,
      comments: input.comments.trim(),
      relatedId: ride.id,
      createdAt: nowIso(),
    };

    await Promise.all([this.db.saveRide(ride), this.db.saveBike(updated), this.db.saveHistory(history)]);
    this.upsertBikeLocal(updated);
    this.prependHistory(history);
  }

  async performMaintenance(input: {
    bikeId: string;
    typeId: string;
    date: string;
    notes: string;
  }): Promise<void> {
    const bike = this.bikeById(input.bikeId);
    if (!bike) {
      throw new Error('Bicicleta no encontrada');
    }

    const type = this.settings.maintenanceTypes().find((t) => t.id === input.typeId);
    const counter = bike.maintenance.find((m) => m.typeId === input.typeId);
    const hoursAtService = counter?.hoursSinceLast ?? 0;

    const event: MaintenanceEvent = {
      id: createId(),
      bikeId: bike.id,
      typeId: input.typeId,
      date: input.date,
      hoursAtService,
      notes: input.notes.trim(),
      createdAt: nowIso(),
    };

    const updated: Bike = {
      ...bike,
      updatedAt: nowIso(),
      maintenance: bike.maintenance.map((m) =>
        m.typeId === input.typeId
          ? {
              ...m,
              hoursSinceLast: 0,
              // totalUsageHours se conserva: es vida útil del componente
              lastPerformedAt: input.date,
              notes: input.notes.trim() || m.notes,
            }
          : m,
      ),
    };

    const history: HistoryEntry = {
      id: createId(),
      bikeId: bike.id,
      kind: 'maintenance',
      date: input.date,
      title: type?.name ?? input.typeId,
      description: `Reinicio tras ${hoursAtService} h`,
      hours: hoursAtService,
      comments: input.notes.trim(),
      relatedId: event.id,
      createdAt: nowIso(),
    };

    await Promise.all([
      this.db.saveMaintenanceEvent(event),
      this.db.saveBike(updated),
      this.db.saveHistory(history),
    ]);
    this.upsertBikeLocal(updated);
    this.prependHistory(history);
  }

  async updateMaintenanceCounter(input: {
    bikeId: string;
    typeId: string;
    hoursSinceLast: number;
    totalUsageHours: number;
    intervalHours: number;
    notes?: string;
  }): Promise<void> {
    const bike = this.bikeById(input.bikeId);
    if (!bike) {
      throw new Error('Bicicleta no encontrada');
    }
    const updated: Bike = {
      ...bike,
      updatedAt: nowIso(),
      maintenance: bike.maintenance.map((m) =>
        m.typeId === input.typeId
          ? {
              ...m,
              hoursSinceLast: Math.max(0, +input.hoursSinceLast.toFixed(2)),
              totalUsageHours: Math.max(0, +input.totalUsageHours.toFixed(2)),
              intervalHours: Math.max(1, +input.intervalHours.toFixed(2)),
              notes: input.notes != null ? input.notes.trim() : m.notes,
            }
          : m,
      ),
    };
    await this.db.saveBike(updated);
    this.upsertBikeLocal(updated);
  }

  upcomingForBike(bike: Bike): Array<{
    type: MaintenanceTypeDefinition;
    counter: MaintenanceCounter;
    level: AlertLevel;
    intervalHours: number;
  }> {
    const layout = normalizeSuspensionLayout(bike.suspensionLayout);
    const types = this.settings
      .maintenanceTypes()
      .filter((t) => layout === 'full' || !t.requiresFullSuspension);
    return bike.maintenance
      .map((counter) => {
        const type = types.find((t) => t.id === counter.typeId);
        if (!type) {
          return null;
        }
        const intervalHours = counterInterval(counter, type);
        const level = alertLevel(counter.hoursSinceLast, intervalHours);
        return { type, counter, level, intervalHours };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.level !== 'ok')
      .sort((a, b) => {
        const rank = { critical: 0, warning: 1, ok: 2 } as const;
        return rank[a.level] - rank[b.level] || b.counter.hoursSinceLast - a.counter.hoursSinceLast;
      });
  }

  async reloadFromDb(): Promise<void> {
    this.revokeAllPhotoUrls();
    await this.init();
  }

  /** Limpia datos en memoria al cerrar sesión (no toca IndexedDB). */
  clearSession(): void {
    this.revokeAllPhotoUrls();
    this.bikesSignal.set([]);
    this.historySignal.set([]);
    this.readySignal.set(false);
  }

  private upsertBikeLocal(bike: Bike): void {
    this.bikesSignal.update((list) => {
      const next = list.some((b) => b.id === bike.id)
        ? list.map((b) => {
            if (b.id !== bike.id) {
              return b;
            }
            if (b.photoUrl && b.photoUrl !== bike.photoUrl) {
              revokeUrl(b.photoUrl);
            }
            return bike;
          })
        : [...list, bike];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  private prependHistory(entry: HistoryEntry): void {
    this.historySignal.update((list) => [entry, ...list]);
  }

  private revokeAllPhotoUrls(): void {
    for (const bike of this.bikesSignal()) {
      revokeUrl(bike.photoUrl);
    }
  }
}
