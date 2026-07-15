import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { MAINTENANCE_GROUPS } from '../../../core/defaults/catalog';
import {
  alertLevel,
  applicableMaintenanceTypes,
  counterInterval,
  normalizeSuspensionLayout,
} from '../../../core/utils/maintenance.util';
import { AlertLevel, MaintenanceCounter, MaintenanceTypeDefinition } from '../../../core/models';
import { RideDialogComponent } from '../ride-dialog/ride-dialog';
import { MaintenanceDialogComponent } from '../maintenance-dialog/maintenance-dialog';
import { MaintenanceEditDialogComponent } from '../maintenance-edit-dialog/maintenance-edit-dialog';

type MaintenanceRow = {
  type: MaintenanceTypeDefinition;
  counter: MaintenanceCounter | undefined;
  hours: number;
  totalUsageHours: number;
  intervalHours: number;
  level: AlertLevel;
};

@Component({
  selector: 'app-bike-detail',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './bike-detail.html',
  styleUrl: './bike-detail.scss',
})
export class BikeDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  private readonly bikeId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly bike = computed(() => this.store.bikeById(this.bikeId));
  readonly history = computed(() => this.store.historyForBike(this.bikeId));
  readonly upcoming = computed(() => {
    const bike = this.bike();
    return bike ? this.store.upcomingForBike(bike) : [];
  });

  readonly featuredCards = computed(() => {
    const bike = this.bike();
    if (!bike) {
      return [];
    }
    const layout = normalizeSuspensionLayout(bike.suspensionLayout);
    const featured = applicableMaintenanceTypes(this.settings.maintenanceTypes(), layout).filter(
      (t) => t.featured,
    );
    return [
      {
        label: 'Horas totales',
        value: bike.totalHours,
        level: 'ok' as const,
      },
      ...featured.map((type) => {
        const counter = bike.maintenance.find((m) => m.typeId === type.id);
        const hours = counter?.hoursSinceLast ?? 0;
        const interval = counterInterval(counter, type);
        return {
          label: type.name,
          value: hours,
          level: alertLevel(hours, interval),
        };
      }),
    ];
  });

  readonly maintenanceGroups = computed(() => {
    const bike = this.bike();
    if (!bike) {
      return [];
    }
    const layout = normalizeSuspensionLayout(bike.suspensionLayout);
    const rows: MaintenanceRow[] = applicableMaintenanceTypes(
      this.settings.maintenanceTypes(),
      layout,
    ).map((type) => {
      const counter = bike.maintenance.find((m) => m.typeId === type.id);
      const hours = counter?.hoursSinceLast ?? 0;
      const intervalHours = counterInterval(counter, type);
      return {
        type,
        counter,
        hours,
        totalUsageHours: counter?.totalUsageHours ?? hours,
        intervalHours,
        level: alertLevel(hours, intervalHours),
      };
    });

    return MAINTENANCE_GROUPS.map((group) => ({
      ...group,
      items: rows.filter((r) => r.type.group === group.id),
    })).filter((g) => g.items.length > 0);
  });

  typeLabel(id: string): string {
    return this.settings.bikeTypeLabel(id);
  }

  suspensionLabel(): string {
    const bike = this.bike();
    return normalizeSuspensionLayout(bike?.suspensionLayout) === 'hardtail'
      ? 'Hardtail'
      : 'Doble suspensión';
  }

  openRide(): void {
    this.dialog.open(RideDialogComponent, {
      width: 'min(440px, 96vw)',
      data: { bikeId: this.bikeId },
    });
  }

  openMaintenance(typeId: string): void {
    this.dialog.open(MaintenanceDialogComponent, {
      width: 'min(440px, 96vw)',
      data: { bikeId: this.bikeId, typeId },
    });
  }

  openEditMaintenance(typeId: string): void {
    this.dialog.open(MaintenanceEditDialogComponent, {
      width: 'min(440px, 96vw)',
      data: { bikeId: this.bikeId, typeId },
    });
  }

  async deleteBike(): Promise<void> {
    const bike = this.bike();
    if (!bike) {
      return;
    }
    if (!confirm(`¿Eliminar ${bike.name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    await this.store.deleteBike(bike.id);
    this.snack.open('Bicicleta eliminada', 'OK', { duration: 2500 });
    await this.router.navigate(['/']);
  }
}
