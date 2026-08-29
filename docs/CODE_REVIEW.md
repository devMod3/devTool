# Code Review Standard

Un PR no está listo para merge sólo porque “funciona”. Debe demostrar seguridad de comportamiento, arquitectura y mantenibilidad.

## Gates obligatorios

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:e2e`

## Checklist del reviewer

### Correctitud

- ¿Existe test que falle antes del cambio y pase después para bugs?
- ¿Los estados de error/cleanup están cubiertos?
- ¿Se puede deshacer/cerrar cualquier modo interactivo?

### SOLID

- **S:** una clase/módulo tiene una razón principal para cambiar.
- **O:** nuevos adapters/use cases no requieren editar el Core estable.
- **L:** ports pueden sustituirse por fakes/adapters sin romper contratos.
- **I:** interfaces pequeñas; no hay “God interfaces”.
- **D:** Application/Core dependen de abstracciones, nunca de Chrome/DOM.

### Arquitectura

- dependencias apuntan hacia adentro;
- Presentation no contiene reglas de evidencia;
- Infrastructure no decide semántica de producto;
- Next.js permanece fuera del runtime de la extensión.

### Seguridad y privacidad

- no se añaden permisos sin justificación explícita;
- no se capturan valores, cookies, tokens, headers o bodies;
- las URLs observadas siguen saneadas;
- no hay telemetría implícita.

### Calidad

- no `any`;
- no promesas flotantes;
- complejidad ≤ 12;
- funciones ≤ 100 líneas salvo excepción argumentada;
- nombres describen intención, no implementación accidental;
- Boy Scout Rule aplicada al área tocada.

## Regla de merge

PR con gate rojo = **no merge**. Una excepción requiere documentar riesgo, owner y fecha de eliminación de la excepción.
