import { describe, expect, it } from 'vitest';
import type { ControlDescriptor, FlowEvent, PageScan } from '../domain/model';
import { createSnapshot, generatePff, generateScreenFlow } from './generate';

const saveControl: ControlDescriptor = {
  selector: '#save',
  role: 'button',
  label: 'Guardar',
  kind: 'action',
  required: false,
  state: [],
};

const linkControl: ControlDescriptor = {
  selector: '#next',
  role: 'link',
  label: 'Siguiente',
  kind: 'navigate',
  required: false,
  state: [],
  target: 'https://example.com/next',
};

const submitControl: ControlDescriptor = {
  selector: '#submit',
  role: 'button',
  label: 'Publicar',
  kind: 'submit',
  required: false,
  state: [],
};

const toggleControl: ControlDescriptor = {
  selector: '#toggle',
  role: 'button',
  label: 'Detalles',
  kind: 'toggle',
  required: false,
  state: ['aria-expanded=false'],
};

const controlledAction: ControlDescriptor = {
  selector: '#menu',
  role: 'button',
  label: 'Menú',
  kind: 'action',
  required: false,
  state: [],
  target: '#panel',
};

const inputControl: ControlDescriptor = {
  selector: '#name',
  role: 'input',
  label: 'Nombre',
  kind: 'input',
  required: true,
  state: [],
};

const selectControl: ControlDescriptor = {
  selector: '#category',
  role: 'select',
  label: 'Categoría',
  kind: 'select',
  required: false,
  state: [],
};

const checkboxControl: ControlDescriptor = {
  selector: '#terms',
  role: 'checkbox',
  label: 'Aceptar',
  kind: 'toggle',
  required: false,
  state: ['checked=false'],
};

const radioControl: ControlDescriptor = {
  selector: '#choice',
  role: 'radio',
  label: 'Opción A',
  kind: 'toggle',
  required: false,
  state: [],
};

const scan: PageScan = {
  generatedAt: '2026-08-29T00:00:00.000Z',
  page: { title: 'Fixture', url: 'https://example.com/', viewport: '1280×720' },
  surfaces: [{ selector: 'main', kind: 'main', label: 'Fixture' }],
  controls: [saveControl, linkControl],
  forms: [],
  states: [],
};

function scanWith(controls: readonly ControlDescriptor[], title = 'Fixture'): PageScan {
  return {
    ...scan,
    page: { ...scan.page, title },
    controls,
  };
}

describe('screen flow generator', () => {
  it('renders semantic outcomes for visible controls', () => {
    const screen = generateScreenFlow(
      scanWith([linkControl, submitControl, toggleControl, selectControl, controlledAction]),
    );
    expect(screen).toContain('[Siguiente]');
    expect(screen).toContain('≈ → https://example.com/next');
    expect(screen).toContain('≈ <Enviar formulario>');
    expect(screen).toContain('≈ {Cambiar estado}');
    expect(screen).toContain('(Categoría)');
    expect(screen).toContain('≈ {Actualizar valor local}');
    expect(screen).toContain('≈ {Controla #panel}');
  });

  it('renders empty screen fallback with the default page title', () => {
    const screen = generateScreenFlow(scanWith([inputControl], ''));
    expect(screen).toContain('S01 · Página');
    expect(screen).toContain('⊘ Sin acciones visibles detectadas');
  });
});

describe('PFF function evidence', () => {
  it('never presents an unobserved action as observed', () => {
    const pff = generatePff(createSnapshot(scan, []));
    expect(pff).toContain('⊘ Resultado no observable sin ejecutar la acción');
    expect(pff).toContain('≈ → https://example.com/next');
    expect(pff).toContain('*Funciones ejecutadas* 0');
  });

  it('counts only observed actionable controls in coverage', () => {
    const events: FlowEvent[] = [
      {
        id: 'E001',
        at: 1,
        evidence: 'observed',
        type: 'click',
        control: saveControl,
      },
    ];
    const pff = generatePff(createSnapshot(scan, events));
    expect(pff).toContain('✓ Acción observada durante grabación');
    expect(pff).toContain('*Cobertura observacional* 50%');
  });

  it('renders empty PFF fallback and full zero-function coverage', () => {
    const pff = generatePff(createSnapshot(scanWith([inputControl], ''), []));
    expect(pff).toContain('PFF-01 · Página');
    expect(pff).toContain('⊘ Sin funciones interactivas detectables');
    expect(pff).toContain('*Cobertura observacional* 100%');
  });
});

describe('PFF interaction evidence', () => {
  it('formats checkbox, radio and required input interactions', () => {
    const events: FlowEvent[] = [
      {
        id: 'E001',
        at: 1,
        evidence: 'observed',
        type: 'change[value-redacted]',
        control: inputControl,
      },
      {
        id: 'E002',
        at: 2,
        evidence: 'observed',
        type: 'change',
        control: checkboxControl,
      },
      {
        id: 'E003',
        at: 3,
        evidence: 'observed',
        type: 'click',
        control: radioControl,
      },
      {
        id: 'E004',
        at: 4,
        evidence: 'observed',
        type: 'submit',
        control: submitControl,
      },
    ];
    const pff = generatePff(
      createSnapshot(
        scanWith([inputControl, checkboxControl, radioControl, submitControl]),
        events,
      ),
    );
    expect(pff).toContain('(Nombre · requerido) · change[value-redacted]');
    expect(pff).toContain('[Checkbox: Aceptar] · change');
    expect(pff).toContain('[Radio: Opción A] · click');
    expect(pff).toContain('[Publicar] · submit');
  });
});

describe('PFF system evidence', () => {
  it('renders route and network evidence including failed requests', () => {
    const events: FlowEvent[] = [
      {
        id: 'E001',
        at: 1,
        evidence: 'observed',
        type: 'route',
        detail: { mode: 'pushState', url: 'https://example.com/dashboard' },
      },
      {
        id: 'E002',
        at: 2,
        evidence: 'observed',
        type: 'network',
        detail: {
          method: 'GET',
          url: 'https://example.com/api/items',
          status: 200,
          ok: true,
          durationMs: 12,
        },
      },
      {
        id: 'E003',
        at: 3,
        evidence: 'observed',
        type: 'network',
        detail: {
          method: 'POST',
          url: 'https://example.com/api/items',
          status: null,
          ok: false,
          durationMs: 8,
        },
      },
    ];
    const pff = generatePff(createSnapshot(scan, events));
    expect(pff).toContain('✓ <Navegación pushState>');
    expect(pff).toContain('→ https://example.com/dashboard');
    expect(pff).toContain('{HTTP 200}');
    expect(pff).toContain('{HTTP error}');
  });

  it('renders state changes with and without causal action ids', () => {
    const events: FlowEvent[] = [
      {
        id: 'E001',
        at: 1,
        evidence: 'observed',
        type: 'state-change',
        after: 'E000',
        changes: [
          {
            selector: '#details',
            label: 'Detalles\n del artículo',
            attribute: 'aria-expanded',
            state: ['aria-expanded=true'],
            visible: true,
          },
        ],
      },
      {
        id: 'E002',
        at: 2,
        evidence: 'observed',
        type: 'state-change',
        changes: [
          {
            selector: '#notice',
            label: 'Aviso',
            attribute: 'hidden',
            state: [],
            visible: false,
          },
        ],
      },
    ];
    const pff = generatePff(createSnapshot(scanWith([toggleControl]), events));
    expect(pff).toContain('✓ {Cambio de estado} después de E000');
    expect(pff).toContain('Detalles  del artículo · aria-expanded · aria-expanded=true');
    expect(pff).toContain('✓ {Cambio de estado}');
    expect(pff).toContain('Aviso · hidden · visible=false');
  });
});

describe('snapshot creation', () => {
  it('copies the events array', () => {
    const events: FlowEvent[] = [
      {
        id: 'E001',
        at: 1,
        evidence: 'observed',
        type: 'click',
        control: saveControl,
      },
    ];
    const snapshot = createSnapshot(scan, events);
    events.length = 0;
    expect(snapshot.schema).toBe('zen-flow-snapshot@2');
    expect(snapshot.events).toHaveLength(1);
  });
});
