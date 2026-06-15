# Angular Signals Patterns

This guide documents the signal patterns currently used in `frontend/` and the constraints discovered while refactoring the app toward Angular's signal-first APIs.

## 1. Use `computed()` for derived state

Use `computed()` when a value can be fully derived from other signals and does not need its own mutable copy.

Example:

```ts
// frontend/src/app/core/services/timezone.service.ts
private readonly timezoneState: Signal<string> = computed(() =>
  this.resolveTimezone(this.settingsService?.settings()),
);
```

Other current examples:

- `LocaleService.localeSignal`
- `TaskManagerService.activeTask`
- `ReportService.columns`
- `LoaderStateService.aggregateLoading`

Rule:

- If a value can be recalculated from source state, prefer `computed()` over `signal()` plus `effect()` mirroring.

## 2. Keep `effect()` for real side effects only

Use `effect()` when the work is not state derivation and must perform an external side effect.

Example:

```ts
// frontend/src/app/core/services/locale.service.ts
effect(() => {
  void this.ensureLocaleDataLoaded(this.localeSignal());
});
```

Other current examples:

- `ReportService` persistence to storage
- `MaterialLocaleBridgeService` syncing Angular Material locale state

Rule:

- Do not use `effect()` to copy one signal into another just to keep them in sync.
- It is acceptable when writing to storage, registering locale data, or coordinating framework APIs that are not signal-native.

## 3. Use `rxResource()` for async signal loading

Use `rxResource()` when async data should stay signal-native at the consumption point.

Example:

```ts
// frontend/src/app/report/services/report.service.ts
private readonly tasksResource = rxResource({
  params: this.debouncedTaskRequest,
  stream: ({ params }) => this.tasksService.filteredList(params.filter, true).pipe(
    take(1),
    catchError(() => of([])),
  ),
});

private readonly tasksState = computed(() => this.tasksResource.value() ?? []);
```

Rule:

- Prefer `rxResource()` for request-driven async state that is read by components/services as signals.
- Keep downstream consumption derived with `computed()` where a fallback or projection is needed.

## 4. Use `toObservable(...).pipe(debounceTime(...))` plus `toSignal()` for debounced signal bridges

When signal state must be debounced before driving async work, convert the source signal to an observable, debounce it, and convert it back to a signal.

Example:

```ts
// frontend/src/app/tasks/components/tasks-menu/tasks-menu.component.ts
private readonly taskFilterName = computed(() => this.createTaskForm.name().value().trim());

private readonly debouncedTaskFilterName = toSignal(
  toObservable(this.taskFilterName).pipe(debounceTime(300)),
  { initialValue: this.taskFilterName() },
);
```

Other current example:

- `ReportService.debouncedTaskRequest`

Rule:

- Use this bridge when the debounce result must stay in signal form for `rxResource()` or other signal-native consumers.

## 5. Current caveat: do not replace the `TasksMenuComponent` debounce bridge with `debounced(...)`

The Angular debounced-signal guide API is not currently a safe drop-in replacement for the task filter flow in `TasksMenuComponent`.

Reason:

- `TasksMenuComponent` already creates an `rxResource()` inside `validateAsync(... factory ...)` for duplicate-name validation.
- During refactoring, replacing the filter bridge with `debounced(...)` introduced nested resource composition and triggered Angular error `NG0992: Cannot create a resource inside the params of another resource`.

Until that limitation changes in Angular or the component's async structure is split apart:

- keep the task filter on `toObservable(...).pipe(debounceTime(...))` plus `toSignal()`
- keep the duplicate-name validator and filter refresh as separate async flows

## 6. Practical selection checklist

Use:

- `signal()` for owned mutable state
- `computed()` for anything derived from existing signals
- `effect()` only for external side effects
- `rxResource()` for request-shaped async signal state
- `toObservable(...).pipe(debounceTime(...))` plus `toSignal()` when debounce must feed signal-native async logic

Avoid:

- mirrored writable state that only repeats another signal
- `effect()` used as a state-copy mechanism
- swapping in `debounced(...)` where the component already composes resource-based async flows and triggers `NG0992`
