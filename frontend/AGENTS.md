# AGENTS.md — Frontend

Angular 22 PWA for Cardholder. TypeScript `~6.0`. Standalone components are the default. The app is zoneless (`provideZonelessChangeDetection` in `src/app/app.config.ts`).

For repo-wide workflow and commits, see [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md). Scripts live in `package.json`.

## Layout

- `src/app/features/<feature>/` — screens and feature-specific services/dialogs.
- `src/app/entities/<entity>/` — `*-api.service.ts`, interfaces, NgRx `state/` (actions, reducers, effects, selectors).
- `src/app/core/` — guards, interceptors, app initializers, shared services.
- `src/app/shared/` — reusable components, pipes, validators, functions, types.
- `src/app/state/` — app-wide NgRx slice (`app` reducer/effects).
- `src/app/app.config.ts`, `app.routes.ts` — bootstrap and lazy routes.
- `src/testing/` — Vitest setup, `testAppState`, Material/dialog/snackbar mocks. Import via `src/testing` or `src/testing/...`.
- `src/environments/` — `environment.ts` replaced by `environment.prod.ts` in production builds.

Routes lazy-load with `loadComponent`. The `cards` feature registers `provideState` / `provideEffects` on its route. `auth`, `user`, and `app` slices are registered in `app.config.ts`.

## Imports and types

`tsconfig.json` has `"strict": true`, but `strictNullChecks` and `noImplicitAny` are off. Do not tighten those flags as a drive-by. Still avoid new `any`; narrow `unknown` at boundaries.

Path alias:

- `@env/*` → `src/environments/*`

`baseUrl` is `frontend/`. Most code imports `src/app/...` and `src/testing`. Match the import style of the file you are editing.

Selectors: elements `app-*` (kebab-case), attribute directives `app*` (camelCase).

## Angular

- New components, directives, and pipes are standalone. Do not set `standalone: true`.
- `changeDetection: ChangeDetectionStrategy.OnPush` on new components; migrate existing ones only when you are already touching the file for the task.
- Prefer `inject()` over constructor injection.
- Inputs: `input()` / `input.required<T>()`. Outputs: `output<T>()`. Two-way state: `model()`.
- Templates use built-in control flow (`@if`, `@for`, `@switch`). Call signals as `myInput()`.
- Do not use `@HostBinding` or `@HostListener`. Use the `host` object on `@Component` / `@Directive`.
- Do not use `ngClass` or `ngStyle`. Use `[class.foo]` and `[style.prop]`.
- Prefer reactive forms (`FormControl`, `FormGroup`) for form screens.
- i18n: `TranslatePipe` from `@ngx-translate/core`. App setup is `provideTranslateService` with `provideTranslateHttpLoader` (`/i18n/*.json`). Do not import `TranslateModule` into components.
- HTTP: `provideHttpClient(withInterceptors([getTokenInterceptor]))`. New interceptors are `HttpInterceptorFn`s, same as `getTokenInterceptor`.
- Keep logic in `.ts`, template in `.html`, styles in `.scss`.

### UI

Use **Angular Material** (`@angular/material/*`). Import each module or standalone directive from its entry point. Icons in templates use Material icon font (`mat-icon` + ligature names). Do not add PrimeNG or another component library.

### State

**Entity and app state** use classic **NgRx** (`createActionGroup`, reducers, effects, selectors). API calls live in `*-api.service.ts` extending `BaseApiService`; effects dispatch success/error actions.

**Local UI state** uses `signal()` / `computed()` / `effect()`. Bridge store to templates with `toSignal(store.select(...))` where that pattern already exists.

Read every reactive dependency at the start of a `computed()`, `effect()`, or `linkedSignal()` — including `input()` and `viewChild()`. An early `return`, `&&`, `||`, or ternary before those reads means Angular never tracks them.

```ts
effect(() => {
  const list = this.cards();
  const el = this.listHost()?.nativeElement;

  if (!list || !el) {
    return;
  }

  this.observe(el);
});
```

- Do not put side effects in `computed()` or in a `linkedSignal()` computation.
- In `effect()`, read dependencies first, then run side effects inside `untracked()` when needed.
- Do not mutate signal values in place. Use `.set()` or `.update()`.

PWA: `provideServiceWorker` in `app.config.ts`. Offline behavior is read-only; respect `isOnlineGuard` on routes that need the API.

## Tests

Unit tests run on Vitest through `@angular/build:unit-test` (jsdom). Setup is `src/testing/setup-file.ts`.

Colocate `*.spec.ts` with the unit. Use `TestBed`, `provideTranslateService()` when the template translates, and `testAppState` / store overrides when the component reads NgRx. Shared doubles belong in `src/testing/helpers/` (re-exported from `src/testing`); add a factory there when the same mock appears in more than one spec.

Group related `it` blocks in a nested `describe` named after the subject (a selector, an effect, a method). Each condition of that subject is its own `it`. Keep the `it` title short: the `describe` name is already the prefix. Leave a single unrelated test, such as creation, at the top level.

## Style

`lint-staged` runs Prettier and ESLint on commit. Follow the Prettier and ESLint config already in the project.

- Drop unused imports. Prefix intentionally unused names with `_` (`@typescript-eslint/no-unused-vars`).
- Do not leave `console.log` in the codebase.
- Every new file ends with a trailing newline.
- Keep diffs limited to the task. Do not migrate unrelated templates or stores.

## Resources

- [Angular components](https://angular.dev/essentials/components)
- [Angular signals](https://angular.dev/essentials/signals)
- [Angular templates](https://angular.dev/essentials/templates)
- [Angular dependency injection](https://angular.dev/essentials/dependency-injection)
