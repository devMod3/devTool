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

const scan: PageScan = {
  generatedAt: '2026-08-29T00:00:00.000Z',
  page: { title: 'Fixture', url: 'https://example.com/', viewport: '1280×720' },
  surfaces: [{ selector: 'main', kind: 'main', label: 'Fixture' }],
  controls: [saveControl, linkControl],
  forms: [],
  states: [],
};

describe('flow generators', () => {
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

  it('renders screen navigation as inferred evidence', () => {
    const screen = generateScreenFlow(scan);
    expect(screen).toContain('[Siguiente]');
    expect(screen).toContain('≈ → https://example.com/next');
  });
});
