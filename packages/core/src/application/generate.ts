import type { ControlDescriptor, FlowEvent, FlowSnapshot, PageScan } from '../domain/model';

const ACTIONABLE = new Set(['navigate', 'submit', 'toggle', 'action']);

function clean(value: string): string {
  return value.replace(/[\r\n]+/gu, ' ').trim().slice(0, 180);
}

function controlNotation(control: ControlDescriptor): string {
  const label = clean(control.label || control.role);
  if (['input', 'select', 'textarea'].includes(control.role)) {
    return `(${label}${control.required ? ' · requerido' : ''})`;
  }
  if (control.role === 'checkbox' || control.role === 'radio') {
    const prefix = control.role === 'checkbox' ? 'Checkbox' : 'Radio';
    return `[${prefix}: ${label}]`;
  }
  return `[${label}]`;
}

function inferredOutcome(control: ControlDescriptor): string {
  if (control.kind === 'navigate' && control.target) return `≈ → ${control.target}`;
  if (control.kind === 'submit') return '≈ <Enviar formulario>';
  if (control.kind === 'toggle') return '≈ {Cambiar estado}';
  if (control.kind === 'input' || control.kind === 'select') return '≈ {Actualizar valor local}';
  if (control.target?.startsWith('#')) return `≈ {Controla ${control.target}}`;
  return '⊘ Resultado no observable sin ejecutar la acción';
}

function eventLines(event: FlowEvent): readonly string[] {
  switch (event.type) {
    case 'route':
      return [`✓ <Navegación ${event.detail.mode}>`, `└── → ${event.detail.url}`];
    case 'network':
      return [
        `✓ <${event.detail.method} ${event.detail.url}>`,
        `└── {HTTP ${event.detail.status ?? 'error'}}`,
      ];
    case 'state-change':
      return [
        `✓ {Cambio de estado}${event.after ? ` después de ${event.after}` : ''}`,
        ...event.changes.map(
          (change) =>
            `├── ${clean(change.label)} · ${change.attribute} · ${change.state.join(', ') || `visible=${String(change.visible)}`}`,
        ),
      ];
    case 'click':
    case 'submit':
    case 'change':
    case 'change[value-redacted]':
      return [`✓ ${controlNotation(event.control)} · ${event.type}`];
  }
}

function actionableControls(scan: PageScan): readonly ControlDescriptor[] {
  return scan.controls.filter((control) => ACTIONABLE.has(control.kind)).slice(0, 100);
}

export function createSnapshot(scan: PageScan, events: readonly FlowEvent[]): FlowSnapshot {
  return { schema: 'zen-flow-snapshot@2', scan, events: [...events] };
}

export function generateScreenFlow(scan: PageScan): string {
  const lines = [
    'SCREEN FLOW · ZEN DEVTOOL',
    '',
    `┌── S01 · ${clean(scan.page.title || 'Página')}`,
    `│   ├── *URL* ${scan.page.url}`,
    `│   ├── *Viewport* ${scan.page.viewport}`,
  ];

  if (scan.surfaces.length) {
    lines.push('│   ├── Superficies');
    for (const surface of scan.surfaces.slice(0, 24)) {
      lines.push(`│   │   ├── ${surface.kind} · ${clean(surface.label)}`);
    }
  }

  lines.push('│   └── Acciones visibles');
  const controls = scan.controls.filter((control) => !['input', 'textarea'].includes(control.role));
  if (!controls.length) lines.push('│       └── ⊘ Sin acciones visibles detectadas');
  for (const control of controls.slice(0, 80)) {
    lines.push(`│       ├── ${controlNotation(control)}`);
    lines.push(`│       │   └── ${inferredOutcome(control)}`);
  }

  lines.push(
    '',
    'EVIDENCIA',
    '✓ Elementos/estados presentes en DOM',
    '≈ Destino o efecto inferido por semántica',
    '⊘ No observable sin ejecutar/interceptar la acción',
  );
  return lines.join('\n');
}

export function generatePff(snapshot: FlowSnapshot): string {
  const { scan, events } = snapshot;
  const observedSelectors = new Set(
    events.flatMap((event) => ('control' in event ? [event.control.selector] : [])),
  );
  const actionable = actionableControls(scan);
  const actionableSelectors = new Set(actionable.map((control) => control.selector));
  const observedCount = [...observedSelectors].filter((selector) => actionableSelectors.has(selector)).length;
  const coverage = actionable.length ? Math.round((observedCount / actionable.length) * 100) : 100;
  const lines = [
    'PFF · PRODUCT FUNCTIONAL FLOW',
    '',
    `┌── PFF-01 · ${clean(scan.page.title || 'Página')}`,
    '│',
    '├── Entrada',
    `│   ├── *URL* ${scan.page.url}`,
    `│   └── {DOM visible · ${scan.controls.length} controles}`,
    '│',
    '├── Funciones detectadas',
  ];

  if (!actionable.length) lines.push('│   └── ⊘ Sin funciones interactivas detectables');
  for (const control of actionable) {
    lines.push(`│   ├── FUNCIÓN · ${clean(control.label)}`);
    lines.push('│   │   ├── Trigger');
    lines.push(`│   │   │   └── ${controlNotation(control)}`);
    if (control.state.length) lines.push(`│   │   ├── Estado inicial · ${control.state.join(' · ')}`);
    lines.push(
      `│   │   └── ${observedSelectors.has(control.selector) ? '✓ Acción observada durante grabación' : inferredOutcome(control)}`,
    );
  }

  lines.push('│', '├── Secuencia observada');
  if (!events.length) lines.push('│   └── ⊘ Sin grabación. Pulsa [Grabar] y ejecuta el flujo real.');
  for (const event of events.slice(-120)) {
    const chunks = eventLines(event);
    lines.push(`│   ├── ${event.id} · ${chunks[0]}`);
    for (const child of chunks.slice(1)) lines.push(`│   │   ${child}`);
  }

  lines.push(
    '│',
    '└── Cobertura',
    `    ├── *Funciones detectadas* ${actionable.length}`,
    `    ├── *Funciones ejecutadas* ${observedCount}`,
    `    └── *Cobertura observacional* ${coverage}%`,
    '',
    'REGLA DE PRECISIÓN',
    '✓ = observado directamente',
    '≈ = inferido de semántica DOM/ARIA',
    '⊘ = no verificable desde la página actual',
  );
  return lines.join('\n');
}
