import type { InspectorPort } from '@devtool/core';
import { INSPECTOR_HOST_TAG } from '../../shared/constants';
import { exactPath, firstElementFromEvent, labelFor } from './dom-utils';
import type { ToolUiBoundary } from './tool-ui-boundary';

export class BrowserInspector implements InspectorPort {
  private readonly listeners = new Set<(active: boolean) => void>();
  private readonly host: HTMLElement;
  private readonly outline: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private readonly toolbar: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly title: HTMLElement;
  private readonly selector: HTMLTextAreaElement;
  private activeFlag = false;

  public constructor(private readonly boundary: ToolUiBoundary) {
    this.host = document.createElement(INSPECTOR_HOST_TAG);
    this.boundary.mark(this.host);
    Object.assign(this.host.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    document.documentElement.appendChild(this.host);
    const shadow = this.host.attachShadow({ mode: 'open' });
    shadow.appendChild(this.createStyle());
    this.outline = this.make('div', 'zi-outline');
    this.hud = this.make('div', 'zi-hud');
    this.toolbar = this.make('div', 'zi-toolbar');
    this.panel = this.make('div', 'zi-panel');
    this.title = document.createElement('strong');
    this.selector = document.createElement('textarea');
    this.mountToolbar();
    this.mountPanel();
    shadow.append(this.outline, this.hud, this.toolbar, this.panel);
    this.renderActiveState();
  }

  public get active(): boolean {
    return this.activeFlag;
  }

  public setActive(active: boolean): void {
    if (active === this.activeFlag) return;
    this.activeFlag = active;
    if (active) this.bindCapture();
    else this.unbindCapture();
    this.renderActiveState();
    for (const listener of this.listeners) listener(active);
  }

  public toggle(): void {
    this.setActive(!this.activeFlag);
  }

  public subscribe(listener: (active: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispose(): void {
    this.setActive(false);
    this.listeners.clear();
    this.host.remove();
  }

  private bindCapture(): void {
    document.addEventListener('pointermove', this.onPointerMove, true);
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    globalThis.addEventListener('scroll', this.onViewportChange, true);
    globalThis.addEventListener('resize', this.onViewportChange);
  }

  private unbindCapture(): void {
    document.removeEventListener('pointermove', this.onPointerMove, true);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    globalThis.removeEventListener('scroll', this.onViewportChange, true);
    globalThis.removeEventListener('resize', this.onViewportChange);
  }

  private readonly onPointerMove = (event: Event): void => {
    if (!this.activeFlag || this.boundary.isToolEvent(event)) return;
    const target = firstElementFromEvent(event);
    if (target) this.highlight(target);
  };

  private readonly onClick = (event: Event): void => {
    if (!this.activeFlag || this.boundary.isToolEvent(event)) return;
    const target = firstElementFromEvent(event);
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.highlight(target);
    this.showSelection(target);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.activeFlag || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.setActive(false);
  };

  private readonly onViewportChange = (): void => {
    this.outline.hidden = true;
    this.hud.hidden = true;
  };

  private highlight(target: Element): void {
    const rect = target.getBoundingClientRect();
    const left = String(Math.max(0, rect.left));
    const top = String(Math.max(0, rect.top));
    const width = String(Math.max(0, rect.width));
    const height = String(Math.max(0, rect.height));
    Object.assign(this.outline.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.outline.hidden = false;
    const roundedWidth = String(Math.round(rect.width));
    const roundedHeight = String(Math.round(rect.height));
    this.hud.textContent = `${labelFor(target)} · ${roundedWidth}×${roundedHeight}`;
    this.hud.hidden = false;
  }

  private showSelection(target: Element): void {
    this.title.textContent = labelFor(target);
    this.selector.value = exactPath(target);
    this.panel.hidden = false;
  }

  private renderActiveState(): void {
    this.toolbar.hidden = !this.activeFlag;
    if (!this.activeFlag) {
      this.outline.hidden = true;
      this.hud.hidden = true;
      this.panel.hidden = true;
    }
  }

  private mountToolbar(): void {
    const label = document.createElement('strong');
    label.textContent = '◉ INSPECTOR ACTIVO · Esc para salir';
    const exit = this.button('Desactivar');
    exit.addEventListener('click', () => {
      this.setActive(false);
    });
    this.toolbar.append(label, exit);
  }

  private mountPanel(): void {
    const header = this.make('header', 'zi-panel-head');
    const close = this.button('Cerrar selección');
    close.addEventListener('click', () => {
      this.panel.hidden = true;
    });
    header.append(this.title, close);
    this.selector.readOnly = true;
    this.selector.spellcheck = false;
    const actions = this.make('footer', 'zi-panel-actions');
    const copy = this.button('Copiar selector');
    copy.addEventListener('click', () => {
      void navigator.clipboard.writeText(this.selector.value).catch(() => {
        this.selector.focus();
        this.selector.select();
      });
    });
    const exit = this.button('Salir de Inspector');
    exit.addEventListener('click', () => {
      this.setActive(false);
    });
    actions.append(copy, exit);
    this.panel.append(header, this.selector, actions);
    this.panel.hidden = true;
  }

  private make<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    return element;
  }

  private button(label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    return button;
  }

  private createStyle(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      *{box-sizing:border-box}.zi-outline{position:fixed;pointer-events:none;border:2px solid #c5ae7a;background:rgba(197,174,122,.10);z-index:2147483644}.zi-hud{position:fixed;left:12px;bottom:12px;padding:8px 10px;background:#121416;color:#f1f0eb;border:1px solid #434a50;font:600 12px/1.3 ui-monospace,monospace;z-index:2147483645}.zi-toolbar{position:fixed;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:12px;align-items:center;pointer-events:auto;padding:8px 10px;background:#171a1d;color:#f1f0eb;border:1px solid #d16f72;font:12px/1.2 system-ui,sans-serif;z-index:2147483647}.zi-toolbar[hidden],.zi-panel[hidden],.zi-outline[hidden],.zi-hud[hidden]{display:none}.zi-panel{position:fixed;top:54px;right:12px;width:min(460px,calc(100vw - 24px));display:grid;gap:10px;pointer-events:auto;padding:12px;background:#121416;color:#f1f0eb;border:1px solid #434a50;font:13px/1.4 system-ui,sans-serif;z-index:2147483647}.zi-panel-head,.zi-panel-actions{display:flex;justify-content:space-between;gap:8px;align-items:center}.zi-panel textarea{width:100%;min-height:100px;background:#0b0d0f;color:#f1f0eb;border:1px solid #434a50;padding:8px;font:12px/1.4 ui-monospace,monospace}.zi-toolbar button,.zi-panel button{min-height:34px;border:1px solid #434a50;background:#1d2125;color:#f1f0eb;padding:0 9px;font:700 11px/1 system-ui,sans-serif;cursor:pointer}.zi-toolbar button:hover,.zi-panel button:hover{border-color:#c5ae7a}`;
    return style;
  }
}
