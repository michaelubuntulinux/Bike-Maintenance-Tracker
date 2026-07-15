import {
  BikeTypeOption,
  MaintenanceGroupMeta,
  MaintenanceTypeDefinition,
  RideTypeOption,
} from '../models';

export const DEFAULT_BIKE_TYPES: BikeTypeOption[] = [
  { id: 'xc', label: 'XC' },
  { id: 'trail', label: 'Trail' },
  { id: 'enduro', label: 'Enduro' },
  { id: 'downhill', label: 'Downhill' },
  { id: 'gravel', label: 'Gravel' },
  { id: 'ruta', label: 'Ruta' },
  { id: 'bikepark', label: 'Bike Park' },
  { id: 'otra', label: 'Otra' },
];

export const DEFAULT_RIDE_TYPES: RideTypeOption[] = [
  { id: 'ciudad', label: 'Ciudad' },
  { id: 'xc', label: 'XC' },
  { id: 'trail', label: 'Trail' },
  { id: 'enduro', label: 'Enduro' },
  { id: 'bikepark', label: 'Bike Park' },
  { id: 'competencia', label: 'Competencia' },
];

/** Orden de grupos en la UI de mantenimiento. */
export const MAINTENANCE_GROUPS: MaintenanceGroupMeta[] = [
  { id: 'drivetrain', label: 'Transmisión' },
  { id: 'brakes', label: 'Frenos' },
  { id: 'wheels', label: 'Ruedas' },
  { id: 'suspension', label: 'Suspensión' },
  { id: 'frame', label: 'Cuadro' },
];

/** Eliminados del catálogo; se filtran en migraciones de settings. */
export const REMOVED_MAINTENANCE_IDS = new Set(['full-torque', 'suspension-check']);

export const DEFAULT_MAINTENANCE_TYPES: MaintenanceTypeDefinition[] = [
  // Transmisión
  {
    id: 'chain-lube',
    name: 'Lubricación de cadena',
    intervalHours: 10,
    group: 'drivetrain',
    featured: true,
  },
  {
    id: 'drivetrain-clean',
    name: 'Limpieza transmisión',
    intervalHours: 15,
    group: 'drivetrain',
    featured: true,
  },
  { id: 'chain-replace', name: 'Cambio cadena', intervalHours: 80, group: 'drivetrain' },
  { id: 'cassette-replace', name: 'Cambio cassette', intervalHours: 150, group: 'drivetrain' },
  { id: 'chainring-replace', name: 'Cambio plato', intervalHours: 200, group: 'drivetrain' },
  { id: 'pulley-replace', name: 'Cambio roldanas', intervalHours: 100, group: 'drivetrain' },

  // Frenos
  { id: 'brake-pads', name: 'Cambio pastillas freno', intervalHours: 40, group: 'brakes' },
  { id: 'brake-bleed', name: 'Purgado frenos', intervalHours: 80, group: 'brakes' },
  { id: 'rotor-replace', name: 'Cambio discos', intervalHours: 200, group: 'brakes' },

  // Ruedas
  { id: 'wheel-true', name: 'Centrado ruedas', intervalHours: 60, group: 'wheels' },
  { id: 'tire-replace', name: 'Cambio neumáticos', intervalHours: 150, group: 'wheels' },
  {
    id: 'tubeless-seal',
    name: 'Sellado tubeless',
    intervalHours: 120,
    group: 'wheels',
    featured: true,
  },
  { id: 'tubeless-fluid', name: 'Cambio líquido tubeless', intervalHours: 60, group: 'wheels' },

  // Suspensión
  {
    id: 'fork-service',
    name: 'Mantención horquilla',
    intervalHours: 50,
    group: 'suspension',
    featured: true,
  },
  {
    id: 'shock-service',
    name: 'Mantención amortiguador',
    intervalHours: 100,
    group: 'suspension',
    featured: true,
    requiresFullSuspension: true,
  },
  { id: 'fork-seals', name: 'Cambio retenes horquilla', intervalHours: 100, group: 'suspension' },
  { id: 'fork-oil', name: 'Cambio aceite horquilla', intervalHours: 50, group: 'suspension' },
  {
    id: 'shock-oil',
    name: 'Cambio aceite amortiguador',
    intervalHours: 100,
    group: 'suspension',
    requiresFullSuspension: true,
  },

  // Cuadro
  {
    id: 'pivot-service',
    name: 'Mantención pivotes',
    intervalHours: 80,
    group: 'frame',
    requiresFullSuspension: true,
  },
  {
    id: 'bearings-replace',
    name: 'Cambio rodamientos',
    intervalHours: 120,
    group: 'frame',
    requiresFullSuspension: true,
  },
  {
    id: 'dropper-service',
    name: 'Mantención tija telescópica',
    intervalHours: 50,
    group: 'frame',
  },
];
