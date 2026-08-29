const DEFAULT_VIEWPORT_PADDING = 8;
const DEFAULT_KEYBOARD_STEP = 12;
const LARGE_KEYBOARD_STEP = 36;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface DragSession {
  readonly pointerId: number;
  readonly originPointer: Point;
  readonly originPanel: Point;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a, input, textarea, select, [contenteditable="true"], [data-no-drag]') !==
      null
  );
}

export class DraggableWindow {
  private dragSession: DragSession | undefined;
  private hasExplicitPosition = false;

  public constructor(
    private readonly panel: HTMLElement,
    private readonly handle: HTMLElement,
    private readonly viewportPadding = DEFAULT_VIEWPORT_PADDING,
  ) {
    this.handle.tabIndex = 0;
    this.handle.setAttribute(
      'aria-label',
      'Mover ventana Zen DevTool. Arrastra con el puntero o usa Alt más las flechas.',
    );
    this.handle.addEventListener('pointerdown', this.onPointerDown);
    this.handle.addEventListener('pointermove', this.onPointerMove);
    this.handle.addEventListener('pointerup', this.onPointerUp);
    this.handle.addEventListener('pointercancel', this.onPointerUp);
    this.handle.addEventListener('keydown', this.onKeyDown);
    globalThis.addEventListener('resize', this.onViewportResize);
  }

  public dispose(): void {
    this.endDrag();
    this.handle.removeEventListener('pointerdown', this.onPointerDown);
    this.handle.removeEventListener('pointermove', this.onPointerMove);
    this.handle.removeEventListener('pointerup', this.onPointerUp);
    this.handle.removeEventListener('pointercancel', this.onPointerUp);
    this.handle.removeEventListener('keydown', this.onKeyDown);
    globalThis.removeEventListener('resize', this.onViewportResize);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const rect = this.panel.getBoundingClientRect();
    this.dragSession = {
      pointerId: event.pointerId,
      originPointer: { x: event.clientX, y: event.clientY },
      originPanel: { x: rect.left, y: rect.top },
    };
    this.ensureExplicitPosition(rect.left, rect.top);
    this.handle.dataset.dragging = 'true';
    this.handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const session = this.dragSession;
    if (!session || session.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - session.originPointer.x;
    const deltaY = event.clientY - session.originPointer.y;
    this.setPosition(session.originPanel.x + deltaX, session.originPanel.y + deltaY);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.dragSession?.pointerId !== event.pointerId) return;
    this.endDrag();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!event.altKey) return;
    const delta = this.keyboardDelta(event.key, event.shiftKey ? LARGE_KEYBOARD_STEP : DEFAULT_KEYBOARD_STEP);
    if (!delta) return;
    const rect = this.panel.getBoundingClientRect();
    this.ensureExplicitPosition(rect.left, rect.top);
    this.setPosition(rect.left + delta.x, rect.top + delta.y);
    event.preventDefault();
  };

  private readonly onViewportResize = (): void => {
    if (!this.hasExplicitPosition) return;
    const rect = this.panel.getBoundingClientRect();
    this.setPosition(rect.left, rect.top);
  };

  private keyboardDelta(key: string, step: number): Point | null {
    switch (key) {
      case 'ArrowLeft':
        return { x: -step, y: 0 };
      case 'ArrowRight':
        return { x: step, y: 0 };
      case 'ArrowUp':
        return { x: 0, y: -step };
      case 'ArrowDown':
        return { x: 0, y: step };
      default:
        return null;
    }
  }

  private ensureExplicitPosition(left: number, top: number): void {
    if (this.hasExplicitPosition) return;
    this.hasExplicitPosition = true;
    this.panel.style.right = 'auto';
    this.panel.style.bottom = 'auto';
    this.setPosition(left, top);
  }

  private setPosition(left: number, top: number): void {
    const rect = this.panel.getBoundingClientRect();
    const maxLeft = Math.max(
      this.viewportPadding,
      globalThis.innerWidth - rect.width - this.viewportPadding,
    );
    const maxTop = Math.max(
      this.viewportPadding,
      globalThis.innerHeight - rect.height - this.viewportPadding,
    );
    const clampedLeft = Math.min(Math.max(this.viewportPadding, left), maxLeft);
    const clampedTop = Math.min(Math.max(this.viewportPadding, top), maxTop);
    this.panel.style.left = `${String(Math.round(clampedLeft))}px`;
    this.panel.style.top = `${String(Math.round(clampedTop))}px`;
  }

  private endDrag(): void {
    const pointerId = this.dragSession?.pointerId;
    this.dragSession = undefined;
    delete this.handle.dataset.dragging;
    if (pointerId !== undefined && this.handle.hasPointerCapture(pointerId)) {
      this.handle.releasePointerCapture(pointerId);
    }
  }
}
