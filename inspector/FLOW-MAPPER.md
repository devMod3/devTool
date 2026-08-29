# Product Flow Mapper v0.3

Zen DevTool genera **Screen Flow** y **Product Functional Flow (PFF)** sobre la página abierta sin presentar inferencias como hechos.

## Contrato de precisión

- `✓` observado directamente;
- `≈` inferido por semántica DOM/ARIA;
- `⊘` no verificable desde el recorrido actual.

**Precisión fuerte = cero afirmaciones ocultamente inferidas.**

## Arquitectura

La semántica del diagrama vive en `packages/core`; DOM/Chrome sólo aportan observaciones. Esto impide que detalles del navegador contaminen reglas de producto.

## Flujo

1. **Analizar** — inventario de la pantalla.
2. **Grabar** — captura observacional sin valores.
3. Ejecuta happy path/errores/estados alternativos.
4. **Detener**.
5. **PFF** o **Screen Flow**.
6. **JSON** para QA/procesamiento.
7. **Inspector** para diagnóstico puntual; `Escape` lo desactiva.

## Datos observables

- DOM/ARIA visible;
- click/submit/change sin valores;
- mutaciones de estado relevantes;
- navegación SPA;
- `fetch`/XHR: método, URL saneada, status y duración.

## Datos que no se capturan

- valores de inputs;
- cookies/tokens;
- headers;
- bodies de red;
- query/hash;
- estados o backend nunca ejecutados.

## Cobertura

PFF reporta funciones detectadas, funciones ejecutadas y cobertura observacional. La cobertura aumenta grabando rutas y estados adicionales; no se falsifica mediante inferencia.
