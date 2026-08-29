import type { ToolUiBoundary } from '../infrastructure/dom/tool-ui-boundary';
import { DEVTOOL_HOST_TAG } from '../shared/constants';
import { DraggableWindow } from './draggable-window';
import { PANEL_STYLES } from './panel-styles';
import { QUICK_GUIDE } from './quick-guide';

export type PanelAction =
  | 'scan'
  | 'record'
  | 'screen'
  | 'pff'
  | 'json'
  | 'inspector'
  | 'clear'
  | 'guide'
  | 'copy'
  | 'close';

export class PanelView {
  private readonly host: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly output: HTMLTextAreaElement;
  private readonly stats: HTMLElement;
  private readonly status: HTMLElement;
  private readonly recordButton: HTMLButtonElement;
  private readonly inspectorButton: HTMLButtonElement;
  private readonly draggableWindow: DraggableWindow;
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
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Zen DevTool · Product Flow Mapper');
    this.stats = this.make('div', 'zf-stats');
    this.status = this.make('span', 'zf-status');
    this.output = document.createElement('textarea');
    this.output.className = 'zf-output';
    this.output.readOnly = true;
    this.output.spellcheck = false;
    this.recordButton = this.actionButton('Grabar', 'record');
    this.inspectorButton = this.actionButton('Inspector · OFF', 'inspector');
    const dragHandle = this.mountPanel(shadow);
    this.draggableWindow = new DraggableWindow(this.panel, dragHandle);
  }

  public onAction(listener: (action: PanelAction) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setOutput(value: string): void {
    this.output.value = value;
  }

  public showGuide(): void {
    this.setOutput(QUICK_GUIDE);
    this.setStatus('Guía rápida');
  }

  public setStats(controls: number, surfaces: number, events: number): void {
    this.stats.textContent = `${String(controls)} controles · ${String(surfaces)} superficies · ${String(events)} eventos observados`;
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
    if (message) {
      globalThis.setTimeout(() => {
        if (this.status.textContent === message) this.status.textContent = '';
      }, 1800);
    }
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
    this.draggableWindow.dispose();
    this.listeners.clear();
    this.host.remove();
  }

  private mountPanel(shadow: ShadowRoot): HTMLElement {
    const header = this.make('header', 'zf-head');
    const dragHandle = this.make('div', 'zf-drag-handle');
    const brand = this.make('div', 'zf-brand');
    const small = document.createElement('small');
    small.textContent = 'ZEN DEVTOOL · v0.3';
    const strong = document.createElement('strong');
    strong.textContent = 'Product Flow Mapper';
    const moveHint = this.make('span', 'zf-move-hint');
    moveHint.textContent = 'Mover · arrastra / Alt+flechas';
    brand.append(small, strong);
    dragHandle.append(brand, moveHint);
    header.append(dragHandle, this.actionButton('Cerrar', 'close'));

    const actions = this.make('footer', 'zf-actions');
    actions.append(
      this.actionButton('Analizar', 'scan'),
      this.recordButton,
      this.actionButton('Screen Flow', 'screen'),
      this.actionButton('PFF', 'pff', 'primary'),
      this.actionButton('JSON', 'json'),
      this.inspectorButton,
      this.actionButton('Limpiar', 'clear'),
      this.actionButton('Guía', 'guide'),
      this.actionButton('Copiar', 'copy'),
      this.status,
    );
    this.panel.append(header, this.stats, this.output, actions);
    this.panel.addEventListener('click', this.onClick);
    shadow.append(this.panel);
    return dragHandle;
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
    style.textContent = PANEL_STYLES;
    return style;
  }
}
