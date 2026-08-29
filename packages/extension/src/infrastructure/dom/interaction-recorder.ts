import type { FlowEvent, RecorderPort, StateChangeEvent } from '@devtool/core';
import { PAGE_PROBE_CONTROL_SOURCE, PAGE_PROBE_SOURCE } from '../../shared/constants';
import {
  controlDescriptor,
  dynamicState,
  exactPath,
  firstElementFromEvent,
  labelFor,
  visible,
} from './dom-utils';
import type { ToolUiBoundary } from './tool-ui-boundary';

const REDACTED_INPUT_TYPES = new Set([
  'password',
  'email',
  'tel',
  'search',
  'text',
  'url',
  'number',
  'date',
  'datetime-local',
  'month',
  'week',
  'time',
]);
const MUTATION_ATTRIBUTES = [
  'hidden',
  'open',
  'disabled',
  'aria-expanded',
  'aria-selected',
  'aria-pressed',
  'aria-hidden',
  'aria-invalid',
];
const MAX_EVENTS = 300;

type PendingChange = StateChangeEvent['changes'][number];

export class BrowserRecorder implements RecorderPort {
  private readonly entries: FlowEvent[] = [];
  private readonly pending = new Map<string, PendingChange>();
  private readonly observer: MutationObserver;
  private recordingFlag = false;
  private lastActionId: string | undefined;
  private mutationTimer: number | undefined;

  public constructor(private readonly boundary: ToolUiBoundary) {
    this.observer = new MutationObserver(this.onMutations);
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: MUTATION_ATTRIBUTES,
    });
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('submit', this.onSubmit, true);
    document.addEventListener('change', this.onChange, true);
    globalThis.addEventListener('message', this.onProbeMessage);
  }

  public get recording(): boolean {
    return this.recordingFlag;
  }

  public start(): void {
    this.recordingFlag = true;
    this.lastActionId = undefined;
    this.setProbeActive(true);
  }

  public stop(): void {
    if (this.recordingFlag) this.flushMutations();
    this.recordingFlag = false;
    this.lastActionId = undefined;
    this.setProbeActive(false);
  }

  public clear(): void {
    this.entries.length = 0;
    this.pending.clear();
    this.lastActionId = undefined;
  }

  public read(): readonly FlowEvent[] {
    return [...this.entries];
  }

  public dispose(): void {
    this.stop();
    this.observer.disconnect();
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('submit', this.onSubmit, true);
    document.removeEventListener('change', this.onChange, true);
    globalThis.removeEventListener('message', this.onProbeMessage);
    if (this.mutationTimer !== undefined) globalThis.clearTimeout(this.mutationTimer);
  }

  private setProbeActive(active: boolean): void {
    globalThis.postMessage({ source: PAGE_PROBE_CONTROL_SOURCE, active }, '*');
  }

  private readonly onClick = (event: Event): void => {
    this.recordInteraction('click', event);
  };

  private readonly onSubmit = (event: Event): void => {
    this.recordInteraction('submit', event);
  };

  private readonly onChange = (event: Event): void => {
    const target = firstElementFromEvent(event);
    const type =
      target instanceof HTMLInputElement && REDACTED_INPUT_TYPES.has(target.type || 'text')
        ? 'change[value-redacted]'
        : 'change';
    this.recordInteraction(type, event);
  };

  private recordInteraction(
    type: 'click' | 'submit' | 'change' | 'change[value-redacted]',
    event: Event,
  ): void {
    if (!this.recordingFlag || this.boundary.isToolEvent(event)) return;
    const target = firstElementFromEvent(event);
    if (!target) return;
    const control =
      target.closest(
        'a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="switch"]',
      ) ?? target;
    const entry = {
      id: this.nextId(),
      at: Date.now(),
      evidence: 'observed' as const,
      type,
      control: controlDescriptor(control),
    };
    this.lastActionId = entry.id;
    this.push(entry);
  }

  private readonly onMutations = (mutations: readonly MutationRecord[]): void => {
    if (!this.recordingFlag) return;
    for (const mutation of mutations) this.collectMutation(mutation);
    if (this.mutationTimer === undefined) {
      this.mutationTimer = globalThis.setTimeout(() => this.flushMutations(), 180);
    }
  };

  private collectMutation(mutation: MutationRecord): void {
    const target =
      mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (!target || this.boundary.isToolElement(target)) return;
    const attribute =
      mutation.type === 'attributes' ? (mutation.attributeName ?? 'attribute') : 'childList';
    const change: PendingChange = {
      selector: exactPath(target),
      label: labelFor(target),
      attribute,
      state: dynamicState(target),
      visible: visible(target),
    };
    this.pending.set(`${change.selector}:${attribute}`, change);
  }

  private flushMutations(): void {
    if (this.mutationTimer !== undefined) globalThis.clearTimeout(this.mutationTimer);
    this.mutationTimer = undefined;
    if (!this.recordingFlag || !this.pending.size) return;
    const base = {
      id: this.nextId(),
      at: Date.now(),
      evidence: 'observed' as const,
      type: 'state-change' as const,
      changes: [...this.pending.values()].slice(0, 30),
    };
    this.pending.clear();
    this.push(this.lastActionId ? { ...base, after: this.lastActionId } : base);
  }

  private readonly onProbeMessage = (event: MessageEvent<unknown>): void => {
    if (!this.recordingFlag || typeof event.data !== 'object' || event.data === null) return;
    const envelope = event.data as { source?: unknown; payload?: unknown };
    if (
      envelope.source !== PAGE_PROBE_SOURCE ||
      typeof envelope.payload !== 'object' ||
      envelope.payload === null
    )
      return;
    const payload = envelope.payload as Record<string, unknown>;
    if (payload.kind === 'route' && typeof payload.url === 'string') {
      this.push({
        id: this.nextId(),
        at: this.readAt(payload.at),
        evidence: 'observed',
        type: 'route',
        detail: { mode: String(payload.mode ?? 'route'), url: payload.url },
      });
    }
    if (payload.kind === 'network' && typeof payload.url === 'string') {
      this.push({
        id: this.nextId(),
        at: this.readAt(payload.at),
        evidence: 'observed',
        type: 'network',
        detail: {
          method: String(payload.method ?? 'GET'),
          url: payload.url,
          status: typeof payload.status === 'number' ? payload.status : null,
          ok: Boolean(payload.ok),
          durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
        },
      });
    }
  };

  private readAt(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
  }

  private nextId(): string {
    return `E${String(this.entries.length + 1).padStart(3, '0')}`;
  }

  private push(entry: FlowEvent): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_EVENTS) this.entries.splice(0, this.entries.length - MAX_EVENTS);
  }
}
