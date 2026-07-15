# AGENTS.md — bikeSev

## Qué es este proyecto

PWA personal **offline-first** para registrar uso y mantenimiento de bicicletas de montaña.

- **Stack**: Angular 20 (standalone), Angular Material 3, Signals, SCSS, IndexedDB, Service Worker (`@angular/service-worker`)
- **Auth**: Amazon Cognito vía Amplify (`CognitoAuthService` + `AuthGate`)
- **Datos**: IndexedDB local (`bikes`, `rides`, …, `photos` Blob) tras autenticarse — sin API de negocio remota
- **Backup**: Exportar/Importar JSON desde Config
- **Deploy**: GitHub Pages (`npm run build:gh`)
- **Idioma UI**: español

Config Cognito en `src/environments/environment.ts`.

## Arquitectura

```
src/app/
  core/          # modelos, defaults, data (IndexedDB), services/stores
  features/      # pantallas por feature (lazy load)
  layout/        # shell (toolbar + router-outlet)
  shared/        # (preferir aquí UI reutilizable si hace falta)
```

- Estado de dominio: **signals** en `BikeStore` / `SettingsService`
- UI: componentes **standalone**, **lazy loading** en `app.routes.ts`
- Preparado para sync nube: no acoplar features a IndexedDB; pasar por servicios/repositorios

## Comandos

```bash
npm start          # http://localhost:4200
npm run build      # producción
npm run build:gh   # GitHub Pages + 404.html SPA fallback
```

## Reglas Cursor

Ver `.cursor/rules/` — contexto de producto, calidad, Angular, Material, IndexedDB y PWA.

## No hacer

- Añadir API de negocio / DB remota sin pedirlo (Cognito ya cubre auth)
- Duplicar lógica de horas/mantenimiento fuera de `BikeStore`
- Usar NgModules clásicos o Patterns pre-standalone
- Guardar datos sensibles de negocio fuera de IndexedDB / backup JSON local
