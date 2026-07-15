import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { todayDateInput } from '../../../core/utils/maintenance.util';

@Component({
  selector: 'app-ride-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './ride-dialog.html',
  styleUrl: './ride-dialog.scss',
})
export class RideDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly dialogRef = inject(MatDialogRef<RideDialogComponent>);
  readonly data = inject<{ bikeId: string }>(MAT_DIALOG_DATA);

  readonly rideTypes = this.settings.rideTypes();
  saving = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    date: [todayDateInput(), Validators.required],
    hours: [1.5, [Validators.required, Validators.min(0.1)]],
    kilometers: [null as number | null],
    rideTypeId: [this.rideTypes[0]?.id ?? 'trail', Validators.required],
    comments: [''],
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
      await this.store.registerRide({
        bikeId: this.data.bikeId,
        date: v.date,
        hours: Number(v.hours),
        kilometers: v.kilometers == null || v.kilometers === ('' as unknown) ? null : Number(v.kilometers),
        comments: v.comments,
        rideTypeId: v.rideTypeId,
      });
      this.dialogRef.close(true);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo guardar la salida';
    } finally {
      this.saving = false;
    }
  }
}
