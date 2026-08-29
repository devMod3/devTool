# Deuda técnica — Zen DevTool

> Registro vivo de deuda técnica, refactorización y riesgos de ingeniería.
>
> Este documento es una herramienta de gestión de equipo: cada tarea debe tener una razón técnica, prioridad, criterio de salida y relación con el presupuesto del ciclo. No se utiliza como lista genérica de mejoras.

## 1. Política tecnológica

### Fuente del producto

El código fuente de Zen DevTool es **TypeScript**.

```text
packages/core/src/**       → TypeScript
packages/extension/src/**  → TypeScript
apps/lab/**                 → TypeScript / TSX
```

### JavaScript compilado

Chromium ejecuta JavaScript, por lo que el build de la extensión necesariamente produce artefactos `.js`.

Esos archivos son **salida de compilación, no código fuente del producto**.

```text
TypeScript source
      ↓
esbuild / Next.js
      ↓
JavaScript compilado
      ↓
dist/ · artefacto instalable
```

Regla de proyecto:

- no crear código fuente `.js` dentro de `packages/**/src` ni `apps/**`;
- no versionar `packages/extension/dist/`;
- no versionar `packages/extension/dist-e2e/`;
- los bundles `.js` sólo deben existir en artefactos de CI/release o directorios ignorados;
- archivos de configuración como `eslint.config.mjs` son tooling, no producto distribuido;
- cualquier excepción requiere revisión explícita de arquitectura.

Actualmente `.gitignore` ya excluye `dist/` y `dist-e2e/`. Falta convertir la política de “TypeScript-only source” en un gate automático de CI.

---

## 2. Presupuesto del ciclo de trabajo

Por cada **10 unidades de capacidad** del equipo:

| Presupuesto                          | Capacidad | Objetivo                                                                       |
| ------------------------------------ | --------: | ------------------------------------------------------------------------------ |
| Refactor + Boy Scout Rule            |   **70%** | Reducir complejidad y mejorar el código tocado sin cambiar comportamiento      |
| Deuda técnica planificada            |   **20%** | Eliminar riesgos estructurales que no caben naturalmente dentro de una feature |
| Verificación / integración / release |   **10%** | Tests, revisión final, artefactos reproducibles y validación real              |

### Regla de gestión

El 70% de refactorización **no significa reescribir el producto**. Se aplica sobre áreas activamente modificadas y debe preservar contratos existentes.

Cada refactor debe demostrar al menos uno de estos resultados:

- menor complejidad;
- menor acoplamiento;
- responsabilidad más pequeña;
- mejor testabilidad;
- mejor naming;
- mejor cleanup/lifecycle;
- eliminación de duplicación;
- reducción de estados implícitos.

El 20% de deuda se consume empezando por P0 y P1. No se trabaja P2/P3 si existe una P0 abierta salvo bloqueo documentado.

---

# 3. Backlog priorizado

## P0 — Integridad del producto y del proceso

### TD-001 · Prohibir JavaScript como código fuente del producto

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P0  
**Riesgo:** Alto  
**Área:** CI / repository hygiene

#### Qué está mal

La convención actual es TypeScript, pero depende de disciplina humana. El repositorio no tiene todavía un gate que falle si alguien añade accidentalmente `.js` dentro del árbol de código fuente.

Esto permite que, con el tiempo, aparezcan dos fuentes de verdad: TypeScript y JavaScript manual.

#### Por qué hay que arreglarlo

- evita drift entre fuente y build;
- evita revisar archivos generados;
- simplifica ownership;
- hace explícito que JavaScript es un artefacto y no una tecnología fuente del producto;
- reduce errores de cambios hechos directamente sobre bundles compilados.

#### Acción

Crear un gate `source:check` que falle si encuentra `.js`, `.jsx`, `.cjs` o `.mjs` dentro de directorios de producto salvo allowlist explícita.

Ámbitos mínimos:

```text
packages/core/src
packages/extension/src
apps/lab/app
```

Integrarlo en `pnpm check` y GitHub Actions.

#### Criterio de aceptación

- [ ] PR con `packages/extension/src/foo.js` falla CI.
- [ ] `dist/` continúa ignorado por Git.
- [ ] `dist-e2e/` continúa ignorado por Git.
- [ ] documentación de arquitectura declara TypeScript como source-of-truth.
- [ ] artefacto MV3 sigue generando JS normalmente.

---

### TD-002 · Cerrar la topología de PRs apilados antes de seguir ampliando arquitectura

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P0  
**Riesgo:** Alto  
**Área:** Git / integración

#### Qué está mal

`refactor/clean-architecture-v0.3` está apilada sobre `feature/product-flow-mapper` y no directamente sobre `main`.

Esto fue útil para aislar el review, pero dejar ramas apiladas abiertas durante demasiados ciclos aumenta riesgo de:

- divergencia;
- conflictos de merge;
- checks que validan un merge-base distinto del release real;
- dificultad para saber qué commit representa el producto distribuible.

#### Acción

Definir y ejecutar una estrategia de integración única:

```text
PR #1 → integrar
   ↓
actualizar/rebase PR #2
   ↓
CI completo
   ↓
PR #2 → integrar
```

No comenzar una v0.4 estructural antes de cerrar esta cadena.

#### Criterio de aceptación

- [ ] no existen PRs estructurales apilados sin owner;
- [ ] el commit de release deriva de `main`;
- [ ] CI completo corre sobre el commit que se pretende distribuir;
- [ ] el artefacto publicado contiene el SHA de origen.

---

### TD-003 · Artefacto de extensión reproducible y trazable

**Categoría:** Verificación / release · 10%  
**Prioridad:** P0  
**Riesgo:** Alto  
**Área:** Build / CI

#### Qué está mal

El bundle instalable se genera correctamente, pero la trazabilidad entre **commit validado → bundle → ZIP entregado** debe ser un contrato permanente y no una acción manual.

#### Por qué importa

Una extensión puede pasar tests en un SHA y empaquetarse desde otro SHA. Aunque el código funcional sea idéntico, ese proceso no es auditable a nivel de equipo.

#### Acción

Convertir `package-extension.yml` en un flujo estable de release:

- ejecutar sólo después de quality gates;
- empaquetar `packages/extension/dist`;
- incluir SHA/version en metadata de build;
- generar SHA-256 del ZIP;
- conservar el artefacto por política definida;
- verificar `activeTab + scripting` antes de publicar.

#### Criterio de aceptación

- [ ] ZIP identifica SHA exacto de origen;
- [ ] checksum publicado;
- [ ] manifest de producción auditado automáticamente;
- [ ] no hay build generado versionado;
- [ ] release no se construye desde working tree mutable.

---

# P1 — Refactorización prioritaria

Estas tareas consumen principalmente el **70% Refactor + Boy Scout**.

## TD-004 · Dividir `BrowserInspector` por responsabilidades

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivo:** `packages/extension/src/infrastructure/dom/inspector-adapter.ts`  
**Tamaño observado:** ~8.3 KB

#### Qué está mal

`BrowserInspector` concentra demasiadas razones para cambiar:

- lifecycle ON/OFF;
- instalación/eliminación de listeners globales;
- política de interceptación de eventos;
- cálculo del highlight;
- render del HUD;
- render de toolbar;
- render del panel de selección;
- clipboard fallback;
- CSS completo de Inspector.

La clase funciona y tiene tests, pero está cerca de convertirse nuevamente en un componente monolítico.

#### Por qué hay que arreglarlo

Viola progresivamente SRP. Un cambio visual puede tocar el mismo módulo que controla la seguridad de eventos en capture phase, exactamente el tipo de acoplamiento que causó el bug original de “Inspector no permite salir”.

#### Refactor objetivo

```text
BrowserInspector
├── InspectorLifecycle
├── InspectorEventPolicy
├── InspectorHighlighter
└── InspectorView
```

Infrastructure conserva la coordinación; Presentation recibe la construcción visual.

#### Criterio de aceptación

- [ ] ningún módulo mezcla CSS/render con política de cancelación de eventos;
- [ ] Playwright del bug Inspector permanece verde;
- [ ] no aumenta el número de listeners globales;
- [ ] dispose es idempotente;
- [ ] comportamiento observable permanece idéntico.

---

## TD-005 · Dividir `InteractionRecorder` en captura, normalización y almacenamiento de sesión

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivo:** `packages/extension/src/infrastructure/dom/interaction-recorder.ts`  
**Tamaño observado:** ~7.6 KB

#### Qué está mal

Recorder tiene que coordinar eventos DOM, mensajes del page probe, cambios de estado y snapshot de sesión. Aunque está tipado, su superficie crece con cada nueva señal observable.

El riesgo es que agregar `focus`, dialogs, keyboard flows o nuevas fuentes de evidencia convierta Recorder en un “God Adapter”.

#### Refactor objetivo

```text
InteractionRecorder
├── DomEventCapture
├── ProbeEventBridge
├── StateChangeObserver
├── EventNormalizer
└── RecordingSession
```

#### Criterio de aceptación

- [ ] normalización se puede probar sin DOM real;
- [ ] bridge de page probe se prueba con envelopes falsos;
- [ ] session storage es una estructura independiente;
- [ ] ningún input value entra al modelo;
- [ ] iniciar/detener repetidamente no duplica listeners.

---

## TD-006 · Separar `dom-utils.ts` por cohesión

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivo:** `packages/extension/src/infrastructure/dom/dom-utils.ts`  
**Tamaño observado:** ~7.1 KB

#### Qué está mal

`dom-utils.ts` es actualmente un contenedor genérico que mezcla:

- sanitización de URL;
- limpieza de texto;
- generación de selector;
- visibilidad;
- accessible naming;
- role inference;
- clasificación de acciones;
- lectura de estados dinámicos;
- construcción de `ControlDescriptor`;
- extracción desde `composedPath`.

Un archivo `utils` tiende a absorber cualquier función DOM nueva y pierde ownership semántico.

#### Refactor objetivo

```text
dom/
├── selector.ts
├── accessible-name.ts
├── control-classifier.ts
├── control-state.ts
├── sanitizer.ts
└── event-target.ts
```

#### Criterio de aceptación

- [ ] no existe un “utils” multi-propósito;
- [ ] clasificación de controles tiene tests propios;
- [ ] sanitización no depende de lógica visual;
- [ ] selector y a11y naming pueden evolucionar independientemente.

---

## TD-007 · Extraer styling y composición de `PanelView`

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivo:** `packages/extension/src/presentation/panel-view.ts`  
**Tamaño observado:** ~6.8 KB

#### Qué está mal

`PanelView` contiene en el mismo archivo:

- creación del Shadow DOM;
- estado visual;
- dispatcher de acciones;
- clipboard behavior;
- composición completa del panel;
- una hoja CSS extensa como template string.

Presentation puede tener lógica de presentación, pero una sola clase no debe convertirse en mini-framework UI.

#### Refactor objetivo

```text
presentation/
├── panel-view.ts
├── panel-actions.ts
├── panel-styles.ts
└── clipboard-adapter.ts
```

`PanelView` debe quedar principalmente como composición/render y contrato de eventos.

#### Criterio de aceptación

- [ ] estilos no están embebidos en un método de cientos de caracteres;
- [ ] clipboard tiene adapter/fallback testeable;
- [ ] `PanelAction` no requiere casts inseguros desde `dataset`;
- [ ] UI mantiene Shadow DOM y `data-zen-devtool-ui`.

---

## TD-008 · Dividir los generadores PFF / Screen Flow en reglas composables

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivo:** `packages/core/src/application/generate.ts`  
**Tamaño observado:** ~6.4 KB

#### Qué está mal

PFF y Screen Flow seguirán creciendo a medida que se agreguen señales. Mantener todas las reglas de render textual en un único generador aumenta el riesgo de condiciones cruzadas y regresiones difíciles de aislar.

#### Refactor objetivo

Separar reglas puras:

```text
generators/
├── screen-flow.ts
├── pff.ts
├── evidence-renderer.ts
├── control-renderer.ts
├── event-renderer.ts
└── tree-writer.ts
```

#### Criterio de aceptación

- [ ] reglas de evidencia no se duplican;
- [ ] cada familia de evento tiene test dedicado;
- [ ] añadir un nuevo evento no exige editar múltiples switches no relacionados;
- [ ] cobertura actual se mantiene o aumenta.

---

## TD-009 · Tipar el protocolo Page Probe como discriminated union compartida

**Categoría:** Refactor + Boy Scout · 70%  
**Prioridad:** P1  
**Archivos:** `page-probe.ts`, bridge/recorder, `shared/*`

#### Qué está mal

El límite `window.postMessage` cruza mundos distintos del navegador y por ello recibe `unknown`. Actualmente parte del protocolo se reconstruye mediante comprobaciones manuales.

Esto es correcto desde seguridad, pero el contrato semántico debe estar centralizado; de lo contrario producer y consumer pueden divergir silenciosamente.

#### Acción

Definir envelopes compartidos y validadores runtime:

```ts
type ProbeEvent = RouteProbeEvent | FetchProbeEvent | XhrProbeEvent;
```

No confiar en casts; validar datos externos antes de convertirlos al dominio.

#### Criterio de aceptación

- [ ] producer y consumer comparten protocolo versionado;
- [ ] payload inválido se ignora sin throw;
- [ ] URL continúa sanitizada;
- [ ] bodies/headers/cookies siguen fuera del protocolo.

---

# P2 — Deuda importante pero no bloqueante

## TD-010 · Lifecycle reversible del Page Probe

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P2

#### Qué está mal

El probe reemplaza wrappers de `fetch`, `XMLHttpRequest` e `history` una vez por documento y luego queda silencioso cuando Recorder está OFF.

El diseño evita trabajo innecesario, pero mantiene monkeypatches instalados durante toda la vida del documento.

#### Riesgo

- interacción con otras extensiones/instrumentadores;
- páginas que comparan referencias nativas;
- dificultad de teardown completo durante desarrollo/testing.

#### Acción

Evaluar un `ProbeLifecycle` reversible o, si técnicamente no conviene restaurar APIs, documentar y testear explícitamente la invariancia del wrapper.

#### Criterio de aceptación

- [ ] decisión ADR documentada;
- [ ] doble instalación imposible;
- [ ] OFF no emite eventos;
- [ ] no cambia semántica observable de fetch/XHR/history.

---

## TD-011 · Matriz de fixtures DOM reales

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P2  
**Área:** `apps/lab`

Agregar fixtures reproducibles para:

- Shadow DOM de terceros;
- `<dialog>`;
- tabs ARIA;
- forms con errores;
- navegación SPA;
- elementos dinámicos;
- disabled/hidden states;
- nested scrolling;
- contenteditable;
- SVG interactivo;
- iframes same-origin y comportamiento explícito para cross-origin.

#### Por qué

“Funciona en una página normal” no equivale a un mapper robusto para cualquier producto web.

#### Criterio de aceptación

- [ ] cada fixture tiene expectativa PFF/Screen Flow;
- [ ] CI cubre happy path + edge state;
- [ ] comportamientos no verificables se etiquetan `⊘`, nunca se inventan.

---

## TD-012 · Accesibilidad propia de Zen DevTool

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P2

#### Qué falta

La extensión analiza semántica de otras páginas, pero su propia UI necesita un contrato de accesibilidad explícito:

- orden de foco;
- focus visible;
- shortcuts documentados;
- toolbar semantics;
- status announcements;
- focus return al cerrar;
- contraste verificado;
- operación completa por teclado.

#### Criterio de aceptación

- [ ] panel usable sin mouse;
- [ ] Inspector se puede desactivar sólo con teclado;
- [ ] no existe focus trap accidental;
- [ ] estados importantes se anuncian correctamente.

---

# P3 — Evolución / mantenimiento

## TD-013 · Versionado explícito del schema de snapshot

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P3

Definir migraciones/compatibilidad para `zen-flow-snapshot` antes de que consumidores externos dependan de estructuras accidentales.

---

## TD-014 · Métricas internas de complejidad sin telemetría

**Categoría:** Deuda técnica · 20%  
**Prioridad:** P3

Generar en CI métricas estáticas locales:

- archivos más grandes;
- complejidad ciclomática;
- cobertura por paquete;
- dependencias entre capas;
- número de excepciones ESLint.

No enviar telemetría del usuario ni datos de páginas inspeccionadas.

---

# 4. Orden recomendado de ejecución

```text
P0
├── TD-001 TypeScript-only source gate
├── TD-002 cerrar PR stack
└── TD-003 release reproducible

P1 · refactor continuo
├── TD-004 BrowserInspector
├── TD-005 InteractionRecorder
├── TD-006 dom-utils
├── TD-007 PanelView
├── TD-008 generators
└── TD-009 Page Probe protocol

P2
├── TD-010 Probe lifecycle
├── TD-011 DOM fixture matrix
└── TD-012 DevTool accessibility

P3
├── TD-013 snapshot schema
└── TD-014 engineering metrics
```

### Secuencia de cuello de botella

El cuello de botella actual no es añadir funciones nuevas. Es mantener confiable el sistema mientras aumentamos la cantidad de señales que observa.

Por tanto:

1. **Integridad de source/build/merge** primero.
2. **Separar adapters grandes** segundo.
3. **Ampliar fixtures y edge cases** tercero.
4. Sólo después aumentar significativamente capacidades del mapper.

---

# 5. Definición de deuda cerrada

Una tarea no pasa a `DONE` sólo porque el código cambió.

Debe cumplir:

```text
Código refactorizado
├── comportamiento preservado
├── tests de regresión
├── lint/typecheck verdes
├── cobertura no degradada
├── documentación actualizada si cambia contrato
├── sin permisos adicionales implícitos
├── sin datos sensibles nuevos
└── sin nueva deuda equivalente desplazada a otro módulo
```

---

# 6. Review de deuda en equipo

En cada ciclo:

- revisar P0/P1 al inicio;
- reservar capacidad 70/20/10 antes de comprometer features;
- toda deuda nueva debe indicar archivo/contrato afectado y razón;
- no registrar “mejorar código” como tarea: debe existir un problema observable;
- si una feature toca un módulo con deuda P1, aplicar Boy Scout en ese mismo PR cuando el scope sea razonable;
- si el refactor hace crecer demasiado el PR, separar deuda en un PR inmediatamente posterior con owner definido;
- gate rojo = no merge.

## Estado inicial del registro

**Actualizado:** 2026-08-29  
**Rama de creación:** `refactor/clean-architecture-v0.3`  
**Owner de producto/ingeniería:** pendiente de asignar por el equipo.  
**Próxima revisión:** al cerrar la integración de v0.3.
