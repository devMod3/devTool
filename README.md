# devTool

Colección de herramientas de desarrollo independientes de los proyectos que inspeccionan o mantienen.

## Zen DevTool v0.3

La extensión usa Clean Architecture en TypeScript con Product Flow Mapper + Inspector desacoplados.

```text
apps/lab/                Next.js · fixtures de desarrollo
packages/core/           dominio + casos de uso puros
packages/extension/      adapters Chrome/DOM + UI
packages/extension/dist  extensión compilada (generada, no versionada)
tests/e2e/               Playwright
```

El código fuente del producto es **TypeScript/TSX**. JavaScript sólo existe como artefacto compilado para Chromium dentro de `dist/`.

### Desarrollo

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install
pnpm build:extension
pnpm dev
```

En Brave/Chromium carga `packages/extension/dist` mediante **Load unpacked**.

### Quality gates

```bash
pnpm source:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:e2e
```

`pnpm check` ejecuta toda la cadena.

## Documentación

- [Guía forense de uso](./docs/GUIA_FORENSE_DE_USO.md)
- [Arquitectura](./docs/ARCHITECTURE.md)
- [Code Review](./docs/CODE_REVIEW.md)
- [Deuda técnica](./deuda%20t%C3%A9cnica.md)
- [Product Flow Mapper](./inspector/FLOW-MAPPER.md)
- [Contribuir](./CONTRIBUTING.md)

Cada herramienta debe permanecer autocontenida, local-first y con permisos mínimos.
