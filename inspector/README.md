# Zen DevTool

Extensión Manifest V3 para Brave/Chromium que inspecciona el DOM y genera **Screen Flow** + **Product Functional Flow (PFF)** sobre cualquier página web normal tras un gesto explícito del usuario.

## Capacidades

- **Product Flow Mapper** — inventario semántico de la pantalla, funciones detectables, estados y destinos;
- **Recorder** — observa interacciones, cambios DOM, navegación SPA y resultado HTTP sin capturar valores/bodies;
- **PFF** — genera el diagrama funcional de producto con evidencia `✓ / ≈ / ⊘`;
- **Screen Flow** — genera el árbol de pantalla y navegación inferible;
- **JSON Snapshot** — exporta `zen-flow-snapshot@1` para QA/procesamiento posterior;
- **Zen Inspector** — inspección puntual de componente, geometría, layout, tipografía, DOM y ARIA.

Consulta [`FLOW-MAPPER.md`](./FLOW-MAPPER.md) para el contrato de precisión y la gramática del diagrama.

## Instalar en Brave

1. Descarga o clona este repositorio.
2. Abre `brave://extensions/`.
3. Activa **Developer mode**.
4. Pulsa **Load unpacked**.
5. Selecciona `inspector/extension`.
6. Abre una web y pulsa el icono de **Zen DevTool** o `Alt+Shift+Z`.

## Flujo rápido

1. **Analizar** — inventaría la pantalla actual.
2. **Grabar** — ejecuta el flujo real que quieres documentar.
3. **Detener** — cierra la captura observacional.
4. **PFF** — genera el Product Functional Flow.
5. **Screen Flow** — genera el flujo de pantalla.
6. **Copiar** — lleva el árbol a ChatGPT, documentación o un issue.
7. **Inspector** — activa/desactiva la inspección puntual de elementos.

## Precisión

DevTool no presenta inferencias como hechos:

- `✓` observado directamente;
- `≈` inferido por semántica DOM/ARIA;
- `⊘` no verificable desde el recorrido actual.

Para aumentar cobertura, graba happy paths, errores, empty states, permisos y estados alternativos por separado.

## Privacidad

- permisos: `activeTab` + `scripting`;
- sin `host_permissions` ni `<all_urls>`;
- sin telemetría ni servidor propio;
- sin persistencia del contenido inspeccionado;
- valores de formularios y valores `data-*` no se capturan;
- query strings y hashes se eliminan de URLs registradas;
- no se capturan cookies, tokens, headers ni bodies de red.

Chromium no permite la inyección normal en páginas protegidas como `brave://`, `chrome://` o Chrome Web Store.

## Contrato de regresión

```bash
node inspector/tests/flow-contract.test.mjs
```
