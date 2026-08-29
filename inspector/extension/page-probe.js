'use strict';

(() => {
  const KEY = '__ZEN_FLOW_PAGE_PROBE_V1__';
  if (globalThis[KEY]) return;

  const MESSAGE_SOURCE = 'zen-flow-page-probe';
  const MAX_URL = 800;

  function safeUrl(raw) {
    try {
      const url = new URL(String(raw || ''), document.baseURI);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return `${url.origin}${url.pathname}`.slice(0, MAX_URL);
      }
      return `${url.protocol}[redacted]`;
    } catch {
      return '[unparseable URL]';
    }
  }

  function emit(kind, detail = {}) {
    const payload = Object.freeze({
      kind,
      at: Date.now(),
      ...detail
    });
    globalThis.postMessage({ source: MESSAGE_SOURCE, payload }, '*');
  }

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function zenFlowPushState(state, unused, url) {
    const result = originalPushState(state, unused, url);
    emit('route', { mode: 'pushState', url: safeUrl(location.href) });
    return result;
  };

  history.replaceState = function zenFlowReplaceState(state, unused, url) {
    const result = originalReplaceState(state, unused, url);
    emit('route', { mode: 'replaceState', url: safeUrl(location.href) });
    return result;
  };

  addEventListener('popstate', () => emit('route', { mode: 'popstate', url: safeUrl(location.href) }));
  addEventListener('hashchange', () => emit('route', { mode: 'hashchange', url: safeUrl(location.href) }));

  const originalFetch = globalThis.fetch?.bind(globalThis);
  if (originalFetch) {
    globalThis.fetch = async function zenFlowFetch(input, init = {}) {
      const requestUrl = input instanceof Request ? input.url : input;
      const method = String(init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
      const startedAt = performance.now();
      try {
        const response = await originalFetch(input, init);
        emit('network', {
          transport: 'fetch',
          method,
          url: safeUrl(requestUrl),
          status: response.status,
          ok: response.ok,
          durationMs: Math.round(performance.now() - startedAt)
        });
        return response;
      } catch (error) {
        emit('network', {
          transport: 'fetch',
          method,
          url: safeUrl(requestUrl),
          status: null,
          ok: false,
          durationMs: Math.round(performance.now() - startedAt),
          error: error instanceof Error ? error.name : 'Error'
        });
        throw error;
      }
    };
  }

  const OriginalXHR = globalThis.XMLHttpRequest;
  if (OriginalXHR) {
    const open = OriginalXHR.prototype.open;
    const send = OriginalXHR.prototype.send;
    const meta = new WeakMap();

    OriginalXHR.prototype.open = function zenFlowXhrOpen(method, url, ...rest) {
      meta.set(this, { method: String(method || 'GET').toUpperCase(), url: safeUrl(url) });
      return open.call(this, method, url, ...rest);
    };

    OriginalXHR.prototype.send = function zenFlowXhrSend(body) {
      const startedAt = performance.now();
      this.addEventListener('loadend', () => {
        const data = meta.get(this) || { method: 'GET', url: '[unknown]' };
        emit('network', {
          transport: 'xhr',
          method: data.method,
          url: data.url,
          status: Number.isFinite(this.status) ? this.status : null,
          ok: this.status >= 200 && this.status < 400,
          durationMs: Math.round(performance.now() - startedAt)
        });
      }, { once: true });
      return send.call(this, body);
    };
  }

  globalThis[KEY] = Object.freeze({ version: '1.0.0' });
  emit('probe-ready', { url: safeUrl(location.href) });
})();
