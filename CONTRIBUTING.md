# Contributing

## Setup

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install
pnpm build:extension
pnpm dev
```

Carga `packages/extension/dist` desde `brave://extensions/` o `chrome://extensions/` con Developer mode → Load unpacked.

## Ciclo de trabajo

1. reproduce el comportamiento en `apps/lab`;
2. escribe o ajusta el test de regresión;
3. modifica la capa responsable, no una capa vecina por comodidad;
4. ejecuta `pnpm check`;
5. revisa el diff con `docs/CODE_REVIEW.md`.

## Boy Scout Rule

Deja el código que tocaste un poco mejor: elimina nombres confusos, duplicación o cleanup ausente si está directamente relacionado. Evita convertir una corrección pequeña en una reescritura sin límites.

## Dependencias

No actualices dependencias por reflejo. Confirma compatibilidad entre herramientas. En v0.3 se fija TypeScript 6.0.x deliberadamente porque el rango publicado de typescript-eslint 8.68 todavía es `<6.1.0`.
