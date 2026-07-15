import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { todayDateInput } from '../../../core/utils/maintenance.util';

@Component({
  selector: 'app-maintenance-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './maintenance-dialog.html',
})
export class MaintenanceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<MaintenanceDialogComponent>);
  readonly data = inject<{ bikeId: string; typeId: string }>(MAT_DIALOG_DATA);

  readonly title =
    this.settings.maintenanceTypes().find((t) => t.id === this.data.typeId)?.name ??
    'Mantenimiento';

  saving = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    date: [todayDateInput(), Validators.required],
    notes: [''],
  });

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    try {
      const v = this.form.getRawValue();
      await this.store.performMaintenance({
        bikeId: this.data.bikeId,
        typeId: this.data.typeId,
        date: v.date,
        notes: v.notes,
      });
      this.dialogRef.close(true);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo registrar';
    } finally {
      this.saving = false;
    }
  }
}
