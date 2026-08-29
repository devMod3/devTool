import { DevToolController } from './application/devtool-controller';
import { BrowserScanner } from './infrastructure/dom/dom-scanner';
import { BrowserRecorder } from './infrastructure/dom/interaction-recorder';
import { BrowserInspector } from './infrastructure/dom/inspector-adapter';
import { ToolUiBoundary } from './infrastructure/dom/tool-ui-boundary';
import { PanelView } from './presentation/panel-view';
import { DEVTOOL_API_KEY } from './shared/constants';

interface DevToolApi {
  readonly version: '0.3.0';
  toggle(): void;
  destroy(): void;
}

type DevToolGlobal = typeof globalThis & Record<string, unknown>;
const runtime = globalThis as DevToolGlobal;
const existing = runtime[DEVTOOL_API_KEY] as DevToolApi | undefined;

if (existing) {
  existing.toggle();
} else {
  const boundary = new ToolUiBoundary();
  const scanner = new BrowserScanner(boundary);
  const recorder = new BrowserRecorder(boundary);
  const inspector = new BrowserInspector(boundary);
  const view = new PanelView(boundary);
  const controller = new DevToolController(scanner, recorder, inspector, view);
  controller.mount();

  runtime[DEVTOOL_API_KEY] = Object.freeze({
    version: '0.3.0',
    toggle: () => controller.toggle(),
    destroy: () => {
      controller.dispose();
      delete runtime[DEVTOOL_API_KEY];
    },
  } satisfies DevToolApi);
}
