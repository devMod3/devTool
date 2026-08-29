import { PAGE_PROBE_CONTROL_SOURCE, PAGE_PROBE_KEY, PAGE_PROBE_SOURCE } from './shared/constants';

type ProbeGlobal = typeof globalThis & Record<string, unknown>;
const runtime = globalThis as ProbeGlobal;

if (!runtime[PAGE_PROBE_KEY]) {
  let active = false;

  const safeUrl = (raw: unknown): string => {
    try {
      const url = new URL(String(raw ?? ''), document.baseURI);
      if (url.protocol === 'http:' || url.protocol === 'https:')
        return `${url.origin}${url.pathname}`.slice(0, 800);
      return `${url.protocol}[redacted]`;
    } catch {
      return '[unparseable URL]';
    }
  };

  const emit = (kind: 'route' | 'network', detail: Record<string, unknown>): void => {
    if (!active) return;
    globalThis.postMessage(
      {
        source: PAGE_PROBE_SOURCE,
        payload: { kind, at: Date.now(), ...detail },
      },
      '*',
    );
  };

  globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (typeof event.data !== 'object' || event.data === null) return;
    const command = event.data as { source?: unknown; active?: unknown };
    if (command.source === PAGE_PROBE_CONTROL_SOURCE && typeof command.active === 'boolean') {
      active = command.active;
    }
  });

  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);
  history.pushState = (state, unused, url) => {
    const result = pushState(state, unused, url);
    emit('route', { mode: 'pushState', url: safeUrl(location.href) });
    return result;
  };
  history.replaceState = (state, unused, url) => {
    const result = replaceState(state, unused, url);
    emit('route', { mode: 'replaceState', url: safeUrl(location.href) });
    return result;
  };
  globalThis.addEventListener('popstate', () =>
    emit('route', { mode: 'popstate', url: safeUrl(location.href) }),
  );
  globalThis.addEventListener('hashchange', () =>
    emit('route', { mode: 'hashchange', url: safeUrl(location.href) }),
  );

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : input;
    const method = String(
      init?.method ?? (input instanceof Request ? input.method : 'GET'),
    ).toUpperCase();
    const startedAt = performance.now();
    try {
      const response = await originalFetch(input, init);
      emit('network', {
        transport: 'fetch',
        method,
        url: safeUrl(requestUrl),
        status: response.status,
        ok: response.ok,
        durationMs: Math.round(performance.now() - startedAt),
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
        error: error instanceof Error ? error.name : 'Error',
      });
      throw error;
    }
  };

  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function open(
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ): void {
    xhrMeta.set(this, { method: method.toUpperCase(), url: safeUrl(url) });
    originalOpen.call(this, method, String(url), async, username ?? null, password ?? null);
  } as typeof XMLHttpRequest.prototype.open;

  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function send(
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    const startedAt = performance.now();
    this.addEventListener(
      'loadend',
      () => {
        const meta = xhrMeta.get(this) ?? { method: 'GET', url: '[unknown]' };
        emit('network', {
          transport: 'xhr',
          method: meta.method,
          url: meta.url,
          status: Number.isFinite(this.status) ? this.status : null,
          ok: this.status >= 200 && this.status < 400,
          durationMs: Math.round(performance.now() - startedAt),
        });
      },
      { once: true },
    );
    originalSend.call(this, body ?? null);
  };

  runtime[PAGE_PROBE_KEY] = Object.freeze({ version: '2.0.0' });
}
