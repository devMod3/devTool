'use strict';

(() => {
  const KEY = '__ZEN_FLOW_PROBE_BRIDGE_V1__';
  if (globalThis[KEY]) return;
  const SOURCE = 'zen-flow-page-probe';
  const EVENT = '__zen_flow_probe__';

  function onMessage(event) {
    if (event.source !== globalThis) return;
    const data = event.data;
    if (!data || data.source !== SOURCE || !data.payload) return;
    const payload = data.payload;
    if (!['route', 'network', 'probe-ready'].includes(payload.kind)) return;
    document.dispatchEvent(new CustomEvent(EVENT, {
      detail: {
        kind: payload.kind,
        at: Number(payload.at) || Date.now(),
        mode: payload.mode,
        url: typeof payload.url === 'string' ? payload.url : undefined,
        transport: payload.transport,
        method: payload.method,
        status: payload.status,
        ok: payload.ok,
        durationMs: payload.durationMs,
        error: payload.error
      }
    }));
  }

  addEventListener('message', onMessage);
  globalThis[KEY] = Object.freeze({ version: '1.0.0' });
})();
