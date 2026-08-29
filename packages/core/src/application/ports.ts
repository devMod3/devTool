import type { FlowEvent, PageScan } from '../domain/model';

export interface ScannerPort {
  scan(): PageScan;
}

export interface RecorderPort {
  readonly recording: boolean;
  start(): void;
  stop(): void;
  clear(): void;
  read(): readonly FlowEvent[];
  dispose(): void;
}

export interface InspectorPort {
  readonly active: boolean;
  setActive(active: boolean): void;
  toggle(): void;
  subscribe(listener: (active: boolean) => void): () => void;
  dispose(): void;
}
