import { createSnapshot, generatePff, generateScreenFlow, type InspectorPort, type RecorderPort, type ScannerPort } from '@devtool/core';
import type { PanelAction, PanelView } from '../presentation/panel-view';

export class DevToolController {
  private unsubscribeAction: (() => void) | undefined;
  private unsubscribeInspector: (() => void) | undefined;

  public constructor(
    private readonly scanner: ScannerPort,
    private readonly recorder: RecorderPort,
    private readonly inspector: InspectorPort,
    private readonly view: PanelView,
  ) {}

  public mount(): void {
    this.unsubscribeAction = this.view.onAction(this.handleAction);
    this.unsubscribeInspector = this.inspector.subscribe((active) => this.view.setInspectorActive(active));
    this.view.setInspectorActive(this.inspector.active);
    this.view.setRecording(this.recorder.recording);
    this.renderPff();
  }

  public toggle(): void {
    this.view.toggle();
  }

  public dispose(): void {
    this.unsubscribeAction?.();
    this.unsubscribeInspector?.();
    this.recorder.dispose();
    this.inspector.dispose();
    this.view.dispose();
  }

  private readonly handleAction = (action: PanelAction): void => {
    switch (action) {
      case 'scan':
      case 'pff':
        this.renderPff();
        return;
      case 'screen':
        this.renderScreenFlow();
        return;
      case 'json':
        this.renderJson();
        return;
      case 'record':
        this.toggleRecording();
        return;
      case 'inspector':
        this.inspector.toggle();
        return;
      case 'clear':
        this.recorder.clear();
        this.renderPff();
        return;
      case 'copy':
        void this.view.copyOutput();
        return;
      case 'close':
        this.view.toggle();
        return;
    }
  };

  private toggleRecording(): void {
    if (this.recorder.recording) this.recorder.stop();
    else this.recorder.start();
    this.view.setRecording(this.recorder.recording);
    this.view.setStatus(this.recorder.recording ? 'Ejecuta el flujo real' : 'Grabación detenida');
    this.refreshStats();
  }

  private renderPff(): void {
    const scan = this.scanner.scan();
    const events = this.recorder.read();
    this.view.setOutput(generatePff(createSnapshot(scan, events)));
    this.view.setStats(scan.controls.length, scan.surfaces.length, events.length);
  }

  private renderScreenFlow(): void {
    const scan = this.scanner.scan();
    this.view.setOutput(generateScreenFlow(scan));
    this.view.setStats(scan.controls.length, scan.surfaces.length, this.recorder.read().length);
  }

  private renderJson(): void {
    const scan = this.scanner.scan();
    const events = this.recorder.read();
    this.view.setOutput(JSON.stringify(createSnapshot(scan, events), null, 2));
    this.view.setStats(scan.controls.length, scan.surfaces.length, events.length);
  }

  private refreshStats(): void {
    const scan = this.scanner.scan();
    this.view.setStats(scan.controls.length, scan.surfaces.length, this.recorder.read().length);
  }
}
