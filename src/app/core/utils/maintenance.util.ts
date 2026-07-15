import {
  AlertLevel,
  MaintenanceCounter,
  MaintenanceTypeDefinition,
  SuspensionLayout,
} from '../models';

/** Warning when above interval; critical when above interval + 20%. */
export function alertLevel(hoursSinceLast: number, intervalHours: number): AlertLevel {
  if (intervalHours <= 0) {
    return 'ok';
  }
  if (hoursSinceLast > intervalHours * 1.2) {
    return 'critical';
  }
  if (hoursSinceLast > intervalHours) {
    return 'warning';
  }
  return 'ok';
}

export function progressRatio(hoursSinceLast: number, intervalHours: number): number {
  if (intervalHours <= 0) {
    return 0;
  }
  return Math.min(hoursSinceLast / intervalHours, 2);
}

export function applicableMaintenanceTypes(
  types: MaintenanceTypeDefinition[],
  layout: SuspensionLayout = 'full',
): MaintenanceTypeDefinition[] {
  if (layout === 'full') {
    return types;
  }
  return types.filter((t) => !t.requiresFullSuspension);
}

export function ensureCounters(
  counters: MaintenanceCounter[] | undefined,
  types: MaintenanceTypeDefinition[],
  layout: SuspensionLayout = 'full',
): MaintenanceCounter[] {
  const applicable = applicableMaintenanceTypes(types, layout);
  const byId = new Map((counters ?? []).map((c) => [c.typeId, c]));
  return applicable.map((t) => {
    const existing = byId.get(t.id);
    if (existing) {
      const hoursSinceLast = existing.hoursSinceLast ?? 0;
      const totalUsageHours =
        existing.totalUsageHours != null && existing.totalUsageHours >= 0
          ? existing.totalUsageHours
          : hoursSinceLast;
      return {
        ...existing,
        hoursSinceLast,
        totalUsageHours,
        intervalHours:
          existing.intervalHours != null && existing.intervalHours > 0
            ? existing.intervalHours
            : t.intervalHours,
      };
    }
    return {
      typeId: t.id,
      hoursSinceLast: 0,
      totalUsageHours: 0,
      lastPerformedAt: null,
      notes: '',
      intervalHours: t.intervalHours,
    };
  });
}

export function counterInterval(
  counter: MaintenanceCounter | undefined,
  type: MaintenanceTypeDefinition,
): number {
  if (counter?.intervalHours != null && counter.intervalHours > 0) {
    return counter.intervalHours;
  }
  return type.intervalHours;
}

export function normalizeSuspensionLayout(value: unknown): SuspensionLayout {
  return value === 'hardtail' ? 'hardtail' : 'full';
}

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}
