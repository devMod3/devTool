# Product Flow Mapper

Zen DevTool 0.2 añade un generador local de **Screen Flow** y **Product Functional Flow (PFF)** sobre la página que el usuario tiene abierta.

## Objetivo

Traducir una interfaz real a un diagrama tree útil para Producto, UX, Frontend y QA sin inventar comportamiento no observado.

## Contrato de precisión

La extensión no promete omnisciencia. Ningún analizador de navegador puede conocer con certeza estados que nunca se renderizaron, lógica backend no ejecutada, permisos de otros usuarios o resultados de acciones que el usuario no activó.

Por eso cada salida usa evidencia explícita:

- `✓` observado directamente durante el scan o una grabación;
- `≈` inferido de semántica DOM/ARIA (`href`, `aria-controls`, tipo de control, etc.);
- `⊘` no verificable desde la página/recorrido actual.

**Precisión fuerte = cero afirmaciones ocultamente inferidas.** Lo desconocido permanece desconocido hasta observarlo.

## Qué captura

### Scan estático

- título y URL saneada;
- viewport;
- superficies semánticas (`main`, `nav`, `aside`, `dialog`, `tabpanel`, formularios y secciones etiquetadas);
- botones, enlaces, tabs, switches, inputs, selects, textareas y summaries visibles;
- labels ARIA/HTML;
- estados accesibles (`aria-expanded`, `aria-selected`, `aria-pressed`, `aria-current`, `aria-invalid`, `disabled`, `checked`, `open`);
- formularios, método, destino y campos requeridos.

### Grabación observacional

Al pulsar **Grabar**, el usuario ejecuta el flujo real y DevTool registra:

- click / submit / change (sin valor del campo);
- cambios relevantes del DOM (`hidden`, `open`, `disabled`, ARIA de estado);
- navegación SPA (`pushState`, `replaceState`, `popstate`, `hashchange`);
- `fetch` y XHR: transporte, método, URL sin query/hash, status y duración.

No se capturan bodies de red, headers, cookies, tokens ni valores de inputs.

## Salidas

### Screen Flow

Describe la superficie actual y los destinos inferibles de sus acciones.

```text
┌── S01 · Pantalla
│   ├── Superficies
│   └── Acciones visibles
│       ├── [Guardar]
│       │   └── ⊘ Resultado no observable sin ejecutar
│       └── [Volver]
│           └── ≈ → /ruta
```

### Product Functional Flow (PFF)

Describe cada función detectable y agrega la secuencia realmente ejecutada.

```text
┌── PFF-01 · Pantalla
│
├── Funciones detectadas
│   └── FUNCIÓN · Guardar
│       ├── Trigger
│       │   └── [Guardar]
│       └── ✓ Acción observada durante grabación
│
├── Secuencia observada
│   ├── E001 · ✓ [Guardar] · click
│   ├── E002 · ✓ <PUT /documento>
│   │            └── {HTTP 200}
│   └── E003 · ✓ {Cambio de estado}
│
└── Cobertura
    ├── *Funciones detectadas* 12
    ├── *Funciones ejecutadas* 9
    └── *Cobertura observacional* 75%
```

### JSON

`zen-flow-snapshot@1` conserva el scan y los eventos para procesamiento posterior, QA o generación asistida de especificaciones.

## Uso recomendado

1. Abre la página real (puede estar autenticada).
2. Pulsa el icono **Zen DevTool** o `Alt+Shift+Z`.
3. Pulsa **Analizar** para inventariar la pantalla.
4. Pulsa **Grabar**.
5. Ejecuta un happy path real y los edge cases que quieras documentar.
6. Detén la grabación.
7. Genera **PFF** o **Screen Flow**.
8. Repite para estados, roles y rutas que requieran cobertura adicional.

## Alcance deliberado v0.2

- análisis profundo de la pestaña actual;
- rutas SPA y cambios DOM observados en la sesión actual;
- enlaces a otras páginas aparecen como destinos inferidos;
- una navegación que destruya el documento puede requerir volver a abrir DevTool y continuar la inspección en la nueva página;
- iframes cross-origin y páginas protegidas de Chromium no pueden inspeccionarse como DOM del documento padre.

## Privacidad

DevTool sigue el principio de permisos mínimos:

- `activeTab` + `scripting`;
- sin `<all_urls>`;
- sin telemetría;
- sin servidor propio;
- sin persistencia de snapshots;
- sin valores de formularios;
- sin bodies, cookies, tokens ni headers de red.
