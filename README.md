# devTool

Colección de herramientas de desarrollo independientes de los proyectos que inspeccionan o mantienen.

## Zen DevTool v0.3

La extensión está migrando a una arquitectura limpia TypeScript con Product Flow Mapper + Inspector desacoplados.

```text
apps/lab/                Next.js · fixtures de desarrollo
packages/core/           dominio + casos de uso puros
packages/extension/      adapters Chrome/DOM + UI
packages/extension/dist  extensión compilada (generada)
tests/e2e/               Playwright
```

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
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:e2e
```

`pnpm check` ejecuta toda la cadena.

## Diseño

- [Arquitectura](./docs/ARCHITECTURE.md)
- [Code Review](./docs/CODE_REVIEW.md)
- [Product Flow Mapper](./inspector/FLOW-MAPPER.md)
- [Contribuir](./CONTRIBUTING.md)

Cada herramienta debe permanecer autocontenida, local-first y con permisos mínimos.
