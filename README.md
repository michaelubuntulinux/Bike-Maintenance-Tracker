# bikeSev — Bike Maintenance Tracker

PWA con Angular 20 + Angular Material para registrar uso y mantenimiento de bicicletas de montaña.

**Auth:** Amazon Cognito (Amplify Auth). **Datos:** IndexedDB local (offline tras login).

## Cognito

1. En AWS Console creá un **User Pool** (email login, app client **sin secret**).
2. Editá `src/environments/environment.ts` (y `.prod.ts`):

```ts
cognito: {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXX',
  userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
}
```

3. `npm start` → pantalla Entrar / Registrarse.

## Contexto para IA / calidad

- [`AGENTS.md`](./AGENTS.md) — mapa del proyecto para agentes
- [`.cursor/rules/`](./.cursor/rules/) — reglas de dominio, Angular Signals, Material, IndexedDB, PWA y calidad de código

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

## Build

```bash
npm run build
```

Para GitHub Pages (repo `Bike-Maintenance-Tracker`):

```bash
npm run build:gh
```

Publica el contenido de `dist/bike-maintenance-tracker/browser` en la rama `gh-pages`.

## Funciones

- Tarjetas de bicicletas con foto, horas y último uso
- Registrar salidas (suma horas a todos los contadores)
- Mantenimientos con alertas amarillo/rojo
- Historial cronológico
- Tema claro / oscuro / sistema
- Exportar / importar respaldo JSON
