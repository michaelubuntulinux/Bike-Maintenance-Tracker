import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { BikeStore } from '../../../core/services/bike.store';
import { SettingsService } from '../../../core/services/settings.service';
import { RideDialogComponent } from '../ride-dialog/ride-dialog';

@Component({
  selector: 'app-bike-list',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './bike-list.html',
  styleUrl: './bike-list.scss',
})
export class BikeListComponent {
  private readonly store = inject(BikeStore);
  private readonly settings = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly bikes = this.store.bikes;
  readonly empty = computed(() => this.bikes().length === 0);

  typeLabel(id: string): string {
    return this.settings.bikeTypeLabel(id);
  }

  openRide(bikeId: string, event: Event): void {
    event.stopPropagation();
    this.dialog.open(RideDialogComponent, {
      width: 'min(440px, 96vw)',
      data: { bikeId },
      autoFocus: 'first-tabbable',
    });
  }

  goDetail(id: string): void {
    void this.router.navigate(['/bikes', id]);
  }
}
