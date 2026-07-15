import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { todayDateInput } from '../../../core/utils/maintenance.util';
import { revokeUrl } from '../../../core/utils/photo.util';
import {
  filterBrands,
  filterModels,
  modelsForBrand,
} from '../../../core/defaults/bike-catalog';

@Component({
  selector: 'app-bike-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatRadioModule,
    MatAutocompleteModule,
  ],
  templateUrl: './bike-form.html',
  styleUrl: './bike-form.scss',
})
export class BikeFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly bikeTypes = this.settings.bikeTypes();
  readonly editId = signal<string | null>(null);
  readonly photoPreview = signal<string | null>(null);
  private photoBlob: Blob | null | undefined = undefined;
  private previewOwned = false;
  saving = false;
  error = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    brand: ['', Validators.required],
    model: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1980)]],
    size: [''],
    typeId: [this.bikeTypes[0]?.id ?? 'trail', Validators.required],
    suspensionLayout: ['full' as 'full' | 'hardtail', Validators.required],
    color: [''],
    weightKg: [null as number | null],
    purchaseDate: [todayDateInput()],
    initialKm: [null as number | null],
    initialHours: [0, [Validators.required, Validators.min(0)]],
  });

  readonly brandValue = toSignal(
    this.form.controls.brand.valueChanges.pipe(startWith(this.form.controls.brand.value)),
    { initialValue: this.form.controls.brand.value },
  );

  private readonly modelValue = toSignal(
    this.form.controls.model.valueChanges.pipe(startWith(this.form.controls.model.value)),
    { initialValue: this.form.controls.model.value },
  );

  readonly filteredBrands = computed(() => filterBrands(this.brandValue() ?? ''));
  readonly filteredModels = computed(() =>
    filterModels(this.brandValue() ?? '', this.modelValue() ?? ''),
  );
  readonly hasCatalogModels = computed(() => modelsForBrand(this.brandValue() ?? '').length > 0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      const bike = this.store.bikeById(id);
      if (bike) {
        this.editId.set(id);
        this.photoPreview.set(bike.photoUrl ?? null);
        this.photoBlob = undefined;
        this.form.patchValue({
          name: bike.name,
          brand: bike.brand,
          model: bike.model,
          year: bike.year,
          size: bike.size,
          typeId: bike.typeId,
          suspensionLayout: bike.suspensionLayout ?? 'full',
          color: bike.color,
          weightKg: bike.weightKg,
          purchaseDate: bike.purchaseDate ?? todayDateInput(),
          initialKm: bike.initialKm,
          initialHours: bike.initialHours,
        });
      }
    }
  }

  onBrandSelected(): void {
    const models = modelsForBrand(this.form.controls.brand.value);
    const currentModel = this.form.controls.model.value;
    if (models.length && currentModel && !models.includes(currentModel)) {
      this.form.controls.model.setValue('');
    }
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 2_500_000) {
      this.error = 'La foto debe pesar menos de 2.5 MB';
      return;
    }
    if (this.previewOwned) {
      revokeUrl(this.photoPreview());
    }
    const url = URL.createObjectURL(file);
    this.photoPreview.set(url);
    this.photoBlob = file;
    this.previewOwned = true;
    this.error = '';
  }

  clearPhoto(): void {
    if (this.previewOwned) {
      revokeUrl(this.photoPreview());
    }
    this.photoPreview.set(null);
    this.photoBlob = null;
    this.previewOwned = false;
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    try {
      const v = this.form.getRawValue();
      const bike = await this.store.saveBike({
        id: this.editId() ?? undefined,
        hasPhoto: !!this.photoPreview(),
        photoBlob: this.photoBlob,
        name: v.name,
        brand: v.brand,
        model: v.model,
        year: Number(v.year),
        size: v.size,
        typeId: v.typeId,
        suspensionLayout: v.suspensionLayout,
        color: v.color,
        weightKg: v.weightKg == null ? null : Number(v.weightKg),
        purchaseDate: v.purchaseDate || null,
        initialKm: v.initialKm == null ? null : Number(v.initialKm),
        initialHours: Number(v.initialHours),
      });
      await this.router.navigate(['/bikes', bike.id]);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo guardar';
    } finally {
      this.saving = false;
    }
  }
}
