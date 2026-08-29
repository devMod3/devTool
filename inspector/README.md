# Zen DevTool / Inspector

El prototipo JavaScript v0.2 fue sustituido por la implementación TypeScript v0.3.

Código fuente actual:

- `packages/core/` — modelo y generadores;
- `packages/extension/` — extensión MV3;
- `apps/lab/` — fixtures Next.js;
- `tests/e2e/` — regresiones Playwright.

## Instalar desarrollo

```bash
pnpm install
pnpm build:extension
```

Después carga `packages/extension/dist` con **Load unpacked**.

## Inspector

Inspector ya no se inyecta como una herramienta independiente. Es un modo gestionado por Zen DevTool:

- su UI comparte la frontera `data-zen-devtool-ui`;
- no intercepta controles de DevTool;
- `[Desactivar]` siempre funciona;
- `Escape` siempre sale de Inspector.

Consulta [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) para el contrato completo.
