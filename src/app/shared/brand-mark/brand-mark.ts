import { Component, input } from '@angular/core';

/** Marca bikeSev: eslabones de cadena. */
@Component({
  selector: 'app-brand-mark',
  host: {
    '[class.lg]': 'size() === "lg"',
    '[class.xl]': 'size() === "xl"',
  },
  template: `
    <svg
      class="mark"
      [class.spin]="spin()"
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <!-- Eslabón trasero -->
      <rect
        x="2.5"
        y="13"
        width="20"
        height="14"
        rx="7"
        fill="none"
        stroke="currentColor"
        stroke-width="3.2"
      />
      <!-- Eslabón delantero (entrelazado) -->
      <rect
        x="17.5"
        y="13"
        width="20"
        height="14"
        rx="7"
        fill="none"
        stroke="currentColor"
        stroke-width="3.2"
      />
      <!-- Corte visual de encaje -->
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="3.2"
        stroke-linecap="round"
        d="M20 16.5v7"
        opacity="0.35"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
      color: var(--bikesev-accent);
      flex-shrink: 0;
    }

    .mark {
      width: 1.45rem;
      height: 1.45rem;
      display: block;
    }

    :host.lg .mark {
      width: 1.9rem;
      height: 1.9rem;
    }

    :host.xl .mark {
      width: 2.85rem;
      height: 2.85rem;
    }

    .spin {
      animation: chain-pulse 1.2s ease-in-out infinite;
      transform-origin: 50% 50%;
    }

    @keyframes chain-pulse {
      0%,
      100% {
        transform: rotate(-8deg) scale(1);
        opacity: 1;
      }
      50% {
        transform: rotate(8deg) scale(1.06);
        opacity: 0.85;
      }
    }
  `,
})
export class BrandMarkComponent {
  readonly spin = input(false);
  readonly size = input<'sm' | 'lg' | 'xl'>('sm');
}
