import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { counterInterval } from '../../../core/utils/maintenance.util';

@Component({
  selector: 'app-maintenance-edit-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './maintenance-edit-dialog.html',
  styleUrl: './maintenance-edit-dialog.scss',
})
export class MaintenanceEditDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<MaintenanceEditDialogComponent>);
  readonly data = inject<{ bikeId: string; typeId: string }>(MAT_DIALOG_DATA);

  readonly type =
    this.settings.maintenanceTypes().find((t) => t.id === this.data.typeId) ?? null;
  readonly title = this.type?.name ?? 'Mantenimiento';

  private readonly counter =
    this.store.bikeById(this.data.bikeId)?.maintenance.find((m) => m.typeId === this.data.typeId) ??
    null;

  saving = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    hoursSinceLast: [
      this.counter?.hoursSinceLast ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    totalUsageHours: [
      this.counter?.totalUsageHours ?? this.counter?.hoursSinceLast ?? 0,
      [Validators.required, Validators.min(0)],
    ],
    intervalHours: [
      this.counter && this.type
        ? counterInterval(this.counter, this.type)
        : (this.type?.intervalHours ?? 10),
      [Validators.required, Validators.min(1)],
    ],
    notes: [this.counter?.notes ?? ''],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    try {
      const v = this.form.getRawValue();
      await this.store.updateMaintenanceCounter({
        bikeId: this.data.bikeId,
        typeId: this.data.typeId,
        hoursSinceLast: Number(v.hoursSinceLast),
        totalUsageHours: Number(v.totalUsageHours),
        intervalHours: Number(v.intervalHours),
        notes: v.notes,
      });
      this.dialogRef.close(true);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo guardar';
    } finally {
      this.saving = false;
    }
  }
}
