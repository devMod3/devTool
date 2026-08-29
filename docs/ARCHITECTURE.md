# Zen DevTool v0.3 — Clean Architecture

## Decisión

Zen DevTool usa **Clean Architecture**, no MVC, porque el problema principal no es renderizar vistas: es separar observación, reglas de evidencia, instrumentación del navegador y modos de interacción para que ninguno pueda bloquear al otro.

```text
┌──────────────────────────────────────────────┐
│ Presentation                                 │
│ PanelView                                    │
├──────────────────────────────────────────────┤
│ Application                                  │
│ DevToolController · use cases                │
├──────────────────────────────────────────────┤
│ Domain / Core                                │
│ FlowSnapshot · Evidence · generators         │
├──────────────────────────────────────────────┤
│ Infrastructure                               │
│ DOM Scanner · Recorder · Inspector · Probe   │
└──────────────────────────────────────────────┘
```

La regla obligatoria es **dependencias hacia adentro**. `@devtool/core` no conoce Chrome, DOM, Shadow DOM, Next.js ni UI.

## Responsabilidades

### `packages/core`

- modelo PFF/Screen Flow;
- evidencia `✓ / ≈ / ⊘`;
- generadores puros;
- puertos de Scanner, Recorder e Inspector.

### `packages/extension`

- adapters de DOM/Chrome;
- instrumentación `fetch`/XHR/history;
- UI Shadow DOM;
- coordinación de casos de uso.

### `apps/lab`

- Next.js sólo como entorno reproducible de desarrollo;
- fixtures de estados, formularios, navegación y regresiones;
- nunca se empaqueta dentro de la extensión.

## Invariante de interacción

Toda UI propia debe llevar `data-zen-devtool-ui`. Antes de interceptar un evento, Inspector y Recorder comprueban el `composedPath()` completo. Un evento que pertenezca a DevTool **nunca puede ser cancelado por Inspector**.

## Inspector Mode

- OFF por defecto;
- listeners de captura existen sólo mientras está ON;
- `[Desactivar]` siempre es clicable;
- `Escape` siempre desactiva Inspector;
- activar Inspector detiene una grabación activa para no contaminar el PFF con clics diagnósticos;
- desactivar elimina listeners y overlays;
- no se usa `localStorage` para conservar el modo.

## Page Probe

El wrapper MAIN-world de `fetch`/XHR/history se instala una sola vez por documento, pero permanece **silencioso** cuando Recorder está OFF. Recorder activa/desactiva la emisión mediante un mensaje local; no hay persistencia ni red propia de DevTool.

## Privacidad

Los contratos previos siguen siendo invariantes:

- `activeTab` + `scripting` solamente;
- sin `<all_urls>` ni `host_permissions`;
- sin cookies/tokens/headers/bodies;
- valores de inputs nunca entran al snapshot;
- query/hash se eliminan de URLs observadas.

## Boy Scout Rule

Cada cambio debe dejar el área modificada mejor que antes: menos acoplamiento, mejor naming, tests más claros o deuda explícitamente eliminada. No se aceptan refactors oportunistas sin relación con el cambio si aumentan el scope de revisión.
