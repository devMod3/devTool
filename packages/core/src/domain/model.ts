export type EvidenceKind = 'observed' | 'inferred' | 'unknown';

export type ControlKind = 'navigate' | 'submit' | 'toggle' | 'action' | 'input' | 'select';

export interface ControlDescriptor {
  readonly selector: string;
  readonly role: string;
  readonly label: string;
  readonly kind: ControlKind;
  readonly required: boolean;
  readonly state: readonly string[];
  readonly target?: string;
}

export interface SurfaceDescriptor {
  readonly selector: string;
  readonly kind: string;
  readonly label: string;
}

export interface StateDescriptor {
  readonly selector: string;
  readonly role: string;
  readonly label: string;
  readonly state: readonly string[];
  readonly text: string;
}

export interface FormDescriptor {
  readonly selector: string;
  readonly label: string;
  readonly method: string;
  readonly action: string;
  readonly requiredFields: readonly string[];
}

export interface PageScan {
  readonly generatedAt: string;
  readonly page: {
    readonly title: string;
    readonly url: string;
    readonly viewport: string;
  };
  readonly surfaces: readonly SurfaceDescriptor[];
  readonly controls: readonly ControlDescriptor[];
  readonly forms: readonly FormDescriptor[];
  readonly states: readonly StateDescriptor[];
}

export interface InteractionEvent {
  readonly id: string;
  readonly at: number;
  readonly evidence: 'observed';
  readonly type: 'click' | 'submit' | 'change' | 'change[value-redacted]';
  readonly control: ControlDescriptor;
}

export interface RouteEvent {
  readonly id: string;
  readonly at: number;
  readonly evidence: 'observed';
  readonly type: 'route';
  readonly detail: {
    readonly mode: string;
    readonly url: string;
  };
}

export interface NetworkEvent {
  readonly id: string;
  readonly at: number;
  readonly evidence: 'observed';
  readonly type: 'network';
  readonly detail: {
    readonly method: string;
    readonly url: string;
    readonly status: number | null;
    readonly ok: boolean;
    readonly durationMs: number;
  };
}

export interface StateChangeEvent {
  readonly id: string;
  readonly at: number;
  readonly evidence: 'observed';
  readonly type: 'state-change';
  readonly after?: string;
  readonly changes: readonly {
    readonly selector: string;
    readonly label: string;
    readonly attribute: string;
    readonly state: readonly string[];
    readonly visible: boolean;
  }[];
}

export type FlowEvent = InteractionEvent | RouteEvent | NetworkEvent | StateChangeEvent;

export interface FlowSnapshot {
  readonly schema: 'zen-flow-snapshot@2';
  readonly scan: PageScan;
  readonly events: readonly FlowEvent[];
}
