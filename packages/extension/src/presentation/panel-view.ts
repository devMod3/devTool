import { DEVTOOL_HOST_TAG } from '../shared/constants';
import type { ToolUiBoundary } from '../infrastructure/dom/tool-ui-boundary';

export type PanelAction =
  'scan' | 'record' | 'screen' | 'pff' | 'json' | 'inspector' | 'clear' | 'copy' | 'close';

export class PanelView {
  private readonly host: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly output: HTMLTextAreaElement;
  private readonly stats: HTMLElement;
  private readonly status: HTMLElement;
  private readonly recordButton: HTMLButtonElement;
  private readonly inspectorButton: HTMLButtonElement;
  private readonly listeners = new Set<(action: PanelAction) => void>();

  public constructor(boundary: ToolUiBoundary) {
    this.host = document.createElement(DEVTOOL_HOST_TAG);
    boundary.mark(this.host);
    Object.assign(this.host.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483646',
    });
    document.documentElement.appendChild(this.host);
    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.appendChild(this.createStyle());
    this.panel = this.make('section', 'zf-panel');
    this.stats = this.make('div', 'zf-stats');
    this.status = this.make('span', 'zf-status');
    this.output = document.createElement('textarea');
    this.output.className = 'zf-output';
    this.output.readOnly = true;
    this.output.spellcheck = false;
    this.recordButton = this.actionButton('Grabar', 'record');
    this.inspectorButton = this.actionButton('Inspector · OFF', 'inspector');
    this.mountPanel(shadow);
  }

  public onAction(listener: (action: PanelAction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setOutput(value: string): void {
    this.output.value = value;
  }

  public setStats(controls: number, surfaces: number, events: number): void {
    this.stats.textContent = `${controls} controles · ${surfaces} superficies · ${events} eventos observados`;
  }

  public setRecording(recording: boolean): void {
    this.recordButton.textContent = recording ? 'Detener' : 'Grabar';
    this.recordButton.dataset.active = String(recording);
  }

  public setInspectorActive(active: boolean): void {
    this.inspectorButton.textContent = `Inspector · ${active ? 'ON' : 'OFF'}`;
    this.inspectorButton.dataset.active = String(active);
  }

  public setStatus(message: string): void {
    this.status.textContent = message;
    if (message)
      globalThis.setTimeout(() => {
        if (this.status.textContent === message) this.status.textContent = '';
      }, 1800);
  }

  public toggle(): void {
    this.panel.hidden = !this.panel.hidden;
  }

  public async copyOutput(): Promise<void> {
    if (!this.output.value) return;
    try {
      await navigator.clipboard.writeText(this.output.value);
      this.setStatus('Copiado');
    } catch {
      this.output.focus();
      this.output.select();
      this.setStatus('Seleccionado · Ctrl/Cmd+C');
    }
  }

  public dispose(): void {
    this.listeners.clear();
    this.host.remove();
  }

  private mountPanel(shadow: ShadowRoot): void {
    const header = this.make('header', 'zf-head');
    const brand = this.make('div', 'zf-brand');
    const small = document.createElement('small');
    small.textContent = 'ZEN DEVTOOL · v0.3';
    const strong = document.createElement('strong');
    strong.textContent = 'Product Flow Mapper';
    brand.append(small, strong);
    header.append(brand, this.actionButton('Cerrar', 'close'));
    const actions = this.make('footer', 'zf-actions');
    actions.append(
      this.actionButton('Analizar', 'scan'),
      this.recordButton,
      this.actionButton('Screen Flow', 'screen'),
      this.actionButton('PFF', 'pff', 'primary'),
      this.actionButton('JSON', 'json'),
      this.inspectorButton,
      this.actionButton('Limpiar', 'clear'),
      this.actionButton('Copiar', 'copy'),
      this.status,
    );
    this.panel.append(header, this.stats, this.output, actions);
    this.panel.addEventListener('click', this.onClick);
    shadow.append(this.panel);
  }

  private readonly onClick = (event: Event): void => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-action]')
        : null;
    const action = target?.dataset.action as PanelAction | undefined;
    if (!action) return;
    for (const listener of this.listeners) listener(action);
  };

  private actionButton(label: string, action: PanelAction, className = ''): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.action = action;
    button.className = className;
    return button;
  }

  private make<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  private createStyle(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      *{box-sizing:border-box}.zf-panel{position:fixed;right:12px;bottom:12px;width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;pointer-events:auto;background:#121416;color:#f1f0eb;border:1px solid #434a50;box-shadow:0 24px 80px rgba(0,0,0,.52);font:13px/1.4 system-ui,sans-serif;z-index:2147483646}.zf-panel[hidden]{display:none}.zf-head,.zf-actions{display:flex;align-items:center;gap:8px;padding:10px}.zf-head{justify-content:space-between;border-bottom:1px solid #2d3338}.zf-brand{display:grid;gap:2px}.zf-brand small{color:#c5ae7a;font-size:10px;font-weight:800;letter-spacing:.09em}.zf-brand strong{font:600 16px/1.2 Georgia,serif}.zf-stats{padding:8px 10px;background:#1d2125;border-bottom:1px solid #2d3338;color:#b4b6b8;font-size:11px}.zf-output{width:100%;min-height:360px;max-height:58vh;resize:vertical;border:0;outline:0;padding:12px;background:#0b0d0f;color:#e6e7e3;font:12px/1.5 ui-monospace,monospace;white-space:pre}.zf-actions{flex-wrap:wrap;border-top:1px solid #2d3338}.zf-actions button,.zf-head button{min-height:34px;border:1px solid #434a50;background:#1d2125;color:#f1f0eb;padding:0 9px;font:700 11px/1 system-ui,sans-serif;cursor:pointer}.zf-actions button:hover,.zf-head button:hover{border-color:#c5ae7a}.zf-actions button[data-active="true"]{border-color:#d16f72;color:#d16f72}.zf-actions .primary{border-color:#c5ae7a}.zf-status{margin-left:auto;color:#8fa895;font-size:11px}@media(max-width:640px){.zf-panel{inset:8px;width:auto;max-height:none}.zf-output{min-height:0;max-height:none;flex:1}.zf-actions{max-height:120px;overflow:auto}}`;
    return style;
  }
}
