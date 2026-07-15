/** Identifiers for extensibility (local → cloud sync later). */
export type EntityId = string;

export type BikeTypeId = string;
export type RideTypeId = string;
export type MaintenanceTypeId = string;

export type HistoryKind = 'ride' | 'maintenance';

export type AlertLevel = 'ok' | 'warning' | 'critical';

/** Doble suspensión vs hardtail (sin amortiguador trasero / pivotes). */
export type SuspensionLayout = 'full' | 'hardtail';

export interface BikeTypeOption {
  id: BikeTypeId;
  label: string;
}

export interface RideTypeOption {
  id: RideTypeId;
  label: string;
}

export interface MaintenanceTypeDefinition {
  id: MaintenanceTypeId;
  name: string;
  intervalHours: number;
  /** Grupo UX: transmisión, frenos, etc. */
  group: MaintenanceGroupId;
  /** Featured on dashboard cards */
  featured?: boolean;
  /** Solo aplica a bicis de doble suspensión */
  requiresFullSuspension?: boolean;
}

export type MaintenanceGroupId =
  | 'drivetrain'
  | 'brakes'
  | 'wheels'
  | 'suspension'
  | 'frame';

export interface MaintenanceGroupMeta {
  id: MaintenanceGroupId;
  label: string;
}

export interface MaintenanceCounter {
  typeId: MaintenanceTypeId;
  /** Horas desde el último servicio (se reinicia al realizar mantenimiento). */
  hoursSinceLast: number;
  /**
   * Horas totales de uso del componente desde que se adquirió.
   * Sube con cada salida y NO se reinicia al realizar mantenimiento.
   */
  totalUsageHours: number;
  lastPerformedAt: string | null;
  notes: string;
  /** Intervalo en horas para esta bici (editable por ítem) */
  intervalHours: number;
}

export interface Bike {
  id: EntityId;
  /** Foto en store IndexedDB `photos` (Blob). */
  hasPhoto: boolean;
  /**
   * URL de visualización (object URL o data URL). Solo runtime; no se persiste.
   */
  photoUrl?: string | null;
  /**
   * @deprecated Migración desde respaldos/datos antiguos.
   * Preferir Blob en store `photos`.
   */
  photoDataUrl?: string | null;
  name: string;
  brand: string;
  model: string;
  year: number;
  size: string;
  typeId: BikeTypeId;
  suspensionLayout: SuspensionLayout;
  color: string;
  weightKg: number | null;
  purchaseDate: string | null;
  initialKm: number | null;
  initialHours: number;
  totalHours: number;
  totalKm: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  maintenance: MaintenanceCounter[];
}

/** Foto de bicicleta almacenada como Blob en IndexedDB. */
export interface BikePhotoRecord {
  id: EntityId;
  bikeId: EntityId;
  blob: Blob;
  mimeType: string;
  updatedAt: string;
}

/** Foto serializada para backup JSON. */
export interface BikePhotoBackup {
  id: EntityId;
  bikeId: EntityId;
  mimeType: string;
  dataBase64: string;
  updatedAt: string;
}

export interface Ride {
  id: EntityId;
  bikeId: EntityId;
  date: string;
  hours: number;
  kilometers: number | null;
  comments: string;
  rideTypeId: RideTypeId;
  createdAt: string;
}

export interface MaintenanceEvent {
  id: EntityId;
  bikeId: EntityId;
  typeId: MaintenanceTypeId;
  date: string;
  hoursAtService: number;
  notes: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: EntityId;
  bikeId: EntityId;
  kind: HistoryKind;
  date: string;
  title: string;
  description: string;
  hours: number;
  comments: string;
  relatedId: EntityId;
  createdAt: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  id: 'settings';
  bikeTypes: BikeTypeOption[];
  rideTypes: RideTypeOption[];
  maintenanceTypes: MaintenanceTypeDefinition[];
  theme: ThemePreference;
  updatedAt: string;
}

/** Bike en backup JSON (sin photoUrl runtime). */
export type BackupBike = Omit<Bike, 'photoUrl'>;

export interface BackupPayload {
  version: 1 | 2 | 3;
  exportedAt: string;
  bikes: BackupBike[];
  rides: Ride[];
  maintenanceEvents: MaintenanceEvent[];
  history: HistoryEntry[];
  settings: AppSettings;
  /** v2+: fotos como base64 (Blob en IndexedDB). */
  photos?: BikePhotoBackup[];
}
