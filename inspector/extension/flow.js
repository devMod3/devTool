'use strict';

(() => {
  const API_KEY = '__ZEN_FLOW_MAPPER_V1__';
  const existing = globalThis[API_KEY];
  if (existing && typeof existing.toggle === 'function') {
    existing.toggle();
    return;
  }

  const PROBE_EVENT = '__zen_flow_probe__';
  const HOST_TAG = 'zen-flow-mapper-extension-root';
  const MAX_TEXT = 120;
  const MAX_EVENTS = 300;
  const REDACTED_INPUT_TYPES = new Set(['password', 'email', 'tel', 'search', 'text', 'url', 'number', 'date', 'datetime-local', 'month', 'week', 'time']);

  const state = {
    open: true,
    recording: false,
    scan: null,
    events: [],
    lastAction: null,
    mutationTimer: 0,
    pendingMutations: new Map()
  };

  function safeUrl(raw) {
    try {
      const url = new URL(String(raw || ''), document.baseURI);
      if (url.protocol === 'http:' || url.protocol === 'https:') return `${url.origin}${url.pathname}`;
      if (url.protocol === 'file:') return url.pathname;
      return `${url.protocol}[redacted]`;
    } catch {
      return '[unparseable URL]';
    }
  }

  function cleanText(value, max = MAX_TEXT) {
    return String(value || '').replace(/\s+/gu, ' ').trim().slice(0, max);
  }

  function escapeTree(value) {
    return cleanText(value, 180).replace(/[\r\n]+/gu, ' ');
  }

  function cssEscape(value) {
    if (globalThis.CSS?.escape) return CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/gu, (character) => `\\${character.codePointAt(0)?.toString(16) || '0'} `);
  }

  function exactPath(element) {
    if (!(element instanceof Element)) return '';
    if (element.id) return `#${cssEscape(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node !== document.documentElement && parts.length < 12) {
      if (node.id) {
        parts.unshift(`#${cssEscape(node.id)}`);
        break;
      }
      let part = node.tagName.toLowerCase();
      const stable = [...node.classList]
        .filter((name) => !/^(?:is-|has-|js-|active$|selected$|open$|focus$)/u.test(name))
        .slice(0, 2);
      if (stable.length) part += `.${stable.map(cssEscape).join('.')}`;
      const parent = node.parentElement;
      if (parent) {
        const peers = [...parent.children].filter((child) => child.tagName === node.tagName);
        if (peers.length > 1) part += `:nth-of-type(${peers.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  function visible(element) {
    if (!(element instanceof Element)) return false;
    if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function labelFor(element) {
    if (!(element instanceof Element)) return 'Elemento';
    const aria = cleanText(element.getAttribute('aria-label'));
    if (aria) return aria;
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/u)
        .map((id) => cleanText(document.getElementById(id)?.textContent))
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      const explicit = element.id ? document.querySelector(`label[for="${cssEscape(element.id)}"]`) : null;
      const parentLabel = element.closest('label');
      const label = cleanText(explicit?.textContent || parentLabel?.textContent);
      if (label) return label;
      if (element.getAttribute('placeholder')) return cleanText(element.getAttribute('placeholder'));
      if (element.name) return element.name;
    }
    const text = cleanText(element.textContent);
    if (text) return text;
    if (element.getAttribute('title')) return cleanText(element.getAttribute('title'));
    if (element.id) return element.id;
    return element.tagName.toLowerCase();
  }

  function roleFor(element) {
    if (element.getAttribute('role')) return element.getAttribute('role');
    if (element instanceof HTMLButtonElement) return 'button';
    if (element instanceof HTMLAnchorElement) return 'link';
    if (element instanceof HTMLSelectElement) return 'select';
    if (element instanceof HTMLTextAreaElement) return 'textarea';
    if (element instanceof HTMLInputElement) return element.type === 'checkbox' ? 'checkbox' : element.type === 'radio' ? 'radio' : 'input';
    if (element instanceof HTMLFormElement) return 'form';
    if (element instanceof HTMLDialogElement) return 'dialog';
    return element.tagName.toLowerCase();
  }

  function actionKind(element) {
    if (element instanceof HTMLAnchorElement) return 'navigate';
    if (element instanceof HTMLButtonElement) {
      if (element.type === 'submit') return 'submit';
      if (element.getAttribute('aria-expanded') !== null) return 'toggle';
      return 'action';
    }
    if (element instanceof HTMLSelectElement) return 'select';
    if (element instanceof HTMLTextAreaElement) return 'input';
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') return 'toggle';
      if (element.type === 'submit' || element.type === 'button') return 'action';
      return 'input';
    }
    if (element instanceof HTMLSummaryElement) return 'toggle';
    return 'action';
  }

  function dynamicState(element) {
    const values = [];
    for (const name of ['aria-expanded', 'aria-selected', 'aria-pressed', 'aria-current', 'aria-invalid']) {
      if (element.hasAttribute(name)) values.push(`${name}=${element.getAttribute(name)}`);
    }
    if ('disabled' in element && element.disabled) values.push('disabled=true');
    if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) values.push(`checked=${element.checked}`);
    if (element instanceof HTMLDetailsElement) values.push(`open=${element.open}`);
    return values;
  }

  function controlDescriptor(element) {
    const role = roleFor(element);
    const label = labelFor(element);
    const descriptor = {
      selector: exactPath(element),
      role,
      label,
      kind: actionKind(element),
      required: Boolean(element.required || element.getAttribute('aria-required') === 'true'),
      state: dynamicState(element),
      target: null
    };
    if (element instanceof HTMLAnchorElement) descriptor.target = safeUrl(element.href);
    if (element instanceof HTMLButtonElement && element.getAttribute('aria-controls')) descriptor.target = `#${element.getAttribute('aria-controls')}`;
    if (element instanceof HTMLFormElement) descriptor.target = safeUrl(element.action || location.href);
    return descriptor;
  }

  function headingFor(element) {
    const heading = element.querySelector?.('h1,h2,h3,[role="heading"]');
    return cleanText(heading?.textContent) || cleanText(element.getAttribute?.('aria-label')) || cleanText(element.id) || element.tagName?.toLowerCase() || 'surface';
  }

  function scanPage() {
    const controls = [...document.querySelectorAll('a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="switch"]')]
      .filter((element) => visible(element) && !element.closest(HOST_TAG))
      .map(controlDescriptor);

    const forms = [...document.forms]
      .filter(visible)
      .map((form) => ({
        selector: exactPath(form),
        label: labelFor(form),
        method: String(form.method || 'get').toUpperCase(),
        action: safeUrl(form.action || location.href),
        requiredFields: [...form.elements]
          .filter((field) => field instanceof HTMLElement && (field.required || field.getAttribute('aria-required') === 'true'))
          .map((field) => labelFor(field))
      }));

    const surfaces = [...document.querySelectorAll('main,nav,aside,dialog,[role="dialog"],[role="tabpanel"],section[aria-label],form')]
      .filter((element) => visible(element) && !element.closest(HOST_TAG))
      .slice(0, 80)
      .map((element) => ({
        selector: exactPath(element),
        kind: roleFor(element),
        label: headingFor(element)
      }));

    const states = [...document.querySelectorAll('[role="status"],[role="alert"],[aria-live],dialog[open],[aria-selected="true"],[aria-expanded]')]
      .filter((element) => visible(element) && !element.closest(HOST_TAG))
      .slice(0, 100)
      .map((element) => ({
        selector: exactPath(element),
        role: roleFor(element),
        label: labelFor(element),
        state: dynamicState(element),
        text: element.matches('input,textarea,select') ? '[value redacted]' : cleanText(element.textContent, 180)
      }));

    const scan = Object.freeze({
      generatedAt: new Date().toISOString(),
      page: {
        title: cleanText(document.title, 180),
        url: safeUrl(location.href),
        viewport: `${innerWidth}×${innerHeight}`
      },
      surfaces,
      controls,
      forms,
      states
    });
    state.scan = scan;
    renderStats();
    return scan;
  }

  function pushEvent(event) {
    state.events.push(Object.freeze(event));
    if (state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    renderStats();
  }

  function nearestControl(target) {
    return target?.closest?.('a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="switch"],form') || target;
  }

  function recordInteraction(type, target) {
    if (!state.recording || !(target instanceof Element) || target.closest(HOST_TAG)) return;
    const control = nearestControl(target);
    const descriptor = controlDescriptor(control);
    const event = {
      id: `E${String(state.events.length + 1).padStart(3, '0')}`,
      at: Date.now(),
      evidence: 'observed',
      type,
      control: descriptor
    };
    state.lastAction = event;
    pushEvent(event);
  }

  function significantMutation(target, attributeName) {
    if (!(target instanceof Element) || target.closest(HOST_TAG)) return null;
    const allowed = new Set(['hidden', 'open', 'disabled', 'aria-expanded', 'aria-selected', 'aria-pressed', 'aria-hidden', 'aria-invalid']);
    if (attributeName && !allowed.has(attributeName)) return null;
    return {
      selector: exactPath(target),
      label: labelFor(target),
      attribute: attributeName || 'childList',
      state: dynamicState(target),
      visible: visible(target)
    };
  }

  function flushMutations() {
    state.mutationTimer = 0;
    if (!state.recording || !state.pendingMutations.size) return;
    const changes = [...state.pendingMutations.values()].slice(0, 30);
    state.pendingMutations.clear();
    pushEvent({
      id: `E${String(state.events.length + 1).padStart(3, '0')}`,
      at: Date.now(),
      evidence: 'observed',
      type: 'state-change',
      after: state.lastAction?.id || null,
      changes
    });
  }

  const mutationObserver = new MutationObserver((mutations) => {
    if (!state.recording) return;
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const item = significantMutation(mutation.target, mutation.attributeName);
        if (item) state.pendingMutations.set(`${item.selector}:${item.attribute}`, item);
      } else if (mutation.type === 'childList') {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        const item = significantMutation(target, null);
        if (item && (mutation.addedNodes.length || mutation.removedNodes.length)) {
          state.pendingMutations.set(`${item.selector}:childList`, {
            ...item,
            added: mutation.addedNodes.length,
            removed: mutation.removedNodes.length
          });
        }
      }
    }
    if (!state.mutationTimer) state.mutationTimer = setTimeout(flushMutations, 180);
  });
  mutationObserver.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['hidden', 'open', 'disabled', 'aria-expanded', 'aria-selected', 'aria-pressed', 'aria-hidden', 'aria-invalid']
  });

  document.addEventListener('click', (event) => recordInteraction('click', event.target), true);
  document.addEventListener('submit', (event) => recordInteraction('submit', event.target), true);
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && REDACTED_INPUT_TYPES.has(target.type || 'text')) {
      recordInteraction('change[value-redacted]', target);
      return;
    }
    recordInteraction('change', target);
  }, true);

  document.addEventListener(PROBE_EVENT, (event) => {
    if (!state.recording || !(event instanceof CustomEvent) || !event.detail) return;
    const detail = event.detail;
    if (!['route', 'network', 'probe-ready'].includes(detail.kind)) return;
    pushEvent({
      id: `E${String(state.events.length + 1).padStart(3, '0')}`,
      at: Number(detail.at) || Date.now(),
      evidence: 'observed',
      type: detail.kind,
      detail: JSON.parse(JSON.stringify(detail))
    });
  });

  function treeChildren(lines, prefix, items, formatter) {
    items.forEach((item, index) => {
      const last = index === items.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${formatter(item, index)}`);
    });
  }

  function controlNotation(control) {
    const label = escapeTree(control.label || control.role);
    if (['input', 'select', 'textarea'].includes(control.role)) return `(${label}${control.required ? ' · requerido' : ''})`;
    if (control.role === 'checkbox' || control.role === 'radio') return `[${control.role === 'checkbox' ? 'Checkbox' : 'Radio'}: ${label}]`;
    return `[${label}]`;
  }

  function inferredOutcome(control) {
    if (control.kind === 'navigate' && control.target) return `≈ → ${control.target}`;
    if (control.kind === 'submit') return '≈ <Enviar formulario>';
    if (control.kind === 'toggle') return '≈ {Cambiar estado}';
    if (control.kind === 'input' || control.kind === 'select') return '≈ {Actualizar valor local}';
    if (control.target?.startsWith('#')) return `≈ {Controla ${control.target}}`;
    return '⊘ Resultado no observable sin ejecutar la acción';
  }

  function generateScreenFlow() {
    const scan = scanPage();
    const lines = [
      'SCREEN FLOW · ZEN FLOW MAPPER',
      '',
      `┌── S01 · ${escapeTree(scan.page.title || 'Página')}`,
      `│   ├── *URL* ${scan.page.url}`,
      `│   ├── *Viewport* ${scan.page.viewport}`
    ];

    if (scan.surfaces.length) {
      lines.push('│   ├── Superficies');
      treeChildren(lines, '│   │   ', scan.surfaces.slice(0, 24), (surface) => `${surface.kind} · ${escapeTree(surface.label)}`);
    }

    lines.push('│   └── Acciones visibles');
    const relevant = scan.controls.filter((control) => !['input', 'textarea'].includes(control.role)).slice(0, 80);
    if (!relevant.length) lines.push('│       └── ⊘ Sin acciones visibles detectadas');
    else {
      relevant.forEach((control, index) => {
        const last = index === relevant.length - 1;
        const branch = last ? '└── ' : '├── ';
        const continuation = last ? '    ' : '│   ';
        lines.push(`│       ${branch}${controlNotation(control)}`);
        lines.push(`│       ${continuation}└── ${inferredOutcome(control)}`);
      });
    }

    lines.push('', 'EVIDENCIA', '✓ Elementos/estados presentes en DOM', '≈ Destino o efecto inferido por semántica', '⊘ No observable sin ejecutar/interceptar la acción');
    return lines.join('\n');
  }

  function eventLines(event) {
    if (event.type === 'route') return [`✓ <Navegación ${event.detail?.mode || ''}>`, `  └── → ${event.detail?.url || 'ruta desconocida'}`];
    if (event.type === 'network') return [
      `✓ <${event.detail?.method || 'GET'} ${event.detail?.url || '[url]'}>`,
      `  └── {HTTP ${event.detail?.status ?? 'error'}}`
    ];
    if (event.type === 'state-change') {
      const lines = [`✓ {Cambio de estado}${event.after ? ` después de ${event.after}` : ''}`];
      for (const change of event.changes || []) lines.push(`  ├── ${escapeTree(change.label)} · ${change.attribute} · ${change.state.join(', ') || `visible=${change.visible}`}`);
      return lines;
    }
    const control = event.control;
    return [`✓ ${controlNotation(control)} · ${event.type}`];
  }

  function generatePff() {
    const scan = scanPage();
    const observedControls = new Set(state.events.filter((event) => event.control?.selector).map((event) => event.control.selector));
    const lines = [
      'PFF · PRODUCT FUNCTIONAL FLOW',
      '',
      `┌── PFF-01 · ${escapeTree(scan.page.title || 'Página')}`,
      '│',
      '├── Entrada',
      `│   ├── *URL* ${scan.page.url}`,
      `│   └── {DOM visible · ${scan.controls.length} controles}`, '│',
      '├── Funciones detectadas'
    ];

    const actionable = scan.controls.filter((control) => ['navigate', 'submit', 'toggle', 'action'].includes(control.kind)).slice(0, 100);
    if (!actionable.length) lines.push('│   └── ⊘ Sin funciones interactivas detectables');
    actionable.forEach((control, index) => {
      const last = index === actionable.length - 1;
      const observed = observedControls.has(control.selector);
      lines.push(`│   ${last ? '└── ' : '├── '}FUNCIÓN · ${escapeTree(control.label)}`);
      lines.push(`│   ${last ? '    ' : '│   '}├── Trigger`);
      lines.push(`│   ${last ? '    ' : '│   '}│   └── ${controlNotation(control)}`);
      if (control.state.length) lines.push(`│   ${last ? '    ' : '│   '}├── Estado inicial · ${control.state.join(' · ')}`);
      lines.push(`│   ${last ? '    ' : '│   '}└── ${observed ? '✓ Acción observada durante grabación' : inferredOutcome(control)}`);
    });

    lines.push('│', '├── Secuencia observada');
    if (!state.events.length) lines.push('│   └── ⊘ Sin grabación. Pulsa [Grabar] y ejecuta el flujo real.');
    else {
      state.events.slice(-120).forEach((event, index, all) => {
        const chunks = eventLines(event);
        const last = index === all.length - 1;
        lines.push(`│   ${last ? '└── ' : '├── '}${event.id} · ${chunks[0]}`);
        for (const child of chunks.slice(1)) lines.push(`│   ${last ? '    ' : '│   '}    ${child}`);
      });
    }

    const observedCount = observedControls.size;
    const actionableCount = actionable.length;
    const coverage = actionableCount ? Math.round((observedCount / actionableCount) * 100) : 100;
    lines.push('│', '└── Cobertura', `    ├── *Funciones detectadas* ${actionableCount}`, `    ├── *Funciones ejecutadas* ${observedCount}`, `    └── *Cobertura observacional* ${coverage}%`);
    lines.push('', 'REGLA DE PRECISIÓN', '✓ = observado directamente', '≈ = inferido de semántica DOM/ARIA', '⊘ = no verificable desde la página actual');
    return lines.join('\n');
  }

  function exportJson() {
    return JSON.stringify({
      schema: 'zen-flow-snapshot@1',
      scan: scanPage(),
      events: state.events
    }, null, 2);
  }

  const host = document.createElement(HOST_TAG);
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('inset', '0', 'important');
  host.style.setProperty('pointer-events', 'none', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial}*{box-sizing:border-box}.zf-launch{position:fixed;right:12px;bottom:12px;pointer-events:auto;border:1px solid #c5ae7a;background:#171a1d;color:#f1f0eb;padding:9px 12px;font:700 12px/1 system-ui,sans-serif;cursor:pointer;z-index:2147483647}.zf-panel{position:fixed;right:12px;bottom:58px;width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 78px);display:flex;flex-direction:column;pointer-events:auto;background:#121416;color:#f1f0eb;border:1px solid #434a50;box-shadow:0 24px 80px rgba(0,0,0,.52);font:13px/1.4 system-ui,sans-serif;z-index:2147483647}.zf-panel[hidden]{display:none}.zf-head,.zf-actions{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid #2d3338}.zf-head{justify-content:space-between}.zf-brand{display:grid;gap:2px}.zf-brand small{color:#c5ae7a;font-size:10px;font-weight:800;letter-spacing:.09em}.zf-brand strong{font:600 16px/1.2 Georgia,serif}.zf-stats{padding:8px 10px;background:#1d2125;border-bottom:1px solid #2d3338;color:#b4b6b8;font-size:11px}.zf-output{width:100%;min-height:360px;max-height:58vh;resize:vertical;border:0;outline:0;padding:12px;background:#0b0d0f;color:#e6e7e3;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}.zf-actions{flex-wrap:wrap;border-top:1px solid #2d3338;border-bottom:0}.zf-actions button,.zf-head button{min-height:34px;border:1px solid #434a50;background:#1d2125;color:#f1f0eb;padding:0 9px;font:700 11px/1 system-ui,sans-serif;cursor:pointer}.zf-actions button:hover,.zf-head button:hover{border-color:#c5ae7a}.zf-actions button[data-active="true"]{border-color:#d16f72;color:#d16f72}.zf-actions .primary{border-color:#c5ae7a}.zf-status{margin-left:auto;color:#8fa895;font-size:11px}@media(max-width:640px){.zf-panel{inset:8px 8px 54px 8px;width:auto;max-height:none}.zf-output{min-height:0;max-height:none;flex:1}.zf-actions{max-height:120px;overflow:auto}}
  `;
  shadow.appendChild(style);

  const launcher = document.createElement('button');
  launcher.className = 'zf-launch';
  launcher.type = 'button';
  launcher.textContent = 'Flow';

  const panel = document.createElement('section');
  panel.className = 'zf-panel';
  const head = document.createElement('header');
  head.className = 'zf-head';
  const brand = document.createElement('div');
  brand.className = 'zf-brand';
  brand.innerHTML = '<small>ZEN DEVTOOL</small><strong>Product Flow Mapper</strong>';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Cerrar';
  head.append(brand, close);

  const stats = document.createElement('div');
  stats.className = 'zf-stats';
  const output = document.createElement('textarea');
  output.className = 'zf-output';
  output.readOnly = true;
  output.spellcheck = false;
  const actions = document.createElement('footer');
  actions.className = 'zf-actions';

  function actionButton(label, action, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.action = action;
    if (className) button.className = className;
    return button;
  }

  const scanButton = actionButton('Analizar', 'scan');
  const recordButton = actionButton('Grabar', 'record');
  const screenButton = actionButton('Screen Flow', 'screen');
  const pffButton = actionButton('PFF', 'pff', 'primary');
  const jsonButton = actionButton('JSON', 'json');
  const inspectorButton = actionButton('Inspector', 'inspector');
  const copyButton = actionButton('Copiar', 'copy');
  const clearButton = actionButton('Limpiar grabación', 'clear');
  const status = document.createElement('span');
  status.className = 'zf-status';
  actions.append(scanButton, recordButton, screenButton, pffButton, jsonButton, inspectorButton, clearButton, copyButton, status);
  panel.append(head, stats, output, actions);
  shadow.append(panel, launcher);

  function renderStats() {
    const scan = state.scan;
    stats.textContent = scan
      ? `${scan.controls.length} controles · ${scan.surfaces.length} superficies · ${state.events.length} eventos observados${state.recording ? ' · ● GRABANDO' : ''}`
      : `Sin analizar · ${state.events.length} eventos observados${state.recording ? ' · ● GRABANDO' : ''}`;
    recordButton.textContent = state.recording ? 'Detener' : 'Grabar';
    recordButton.dataset.active = state.recording ? 'true' : 'false';
  }

  async function copyOutput() {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = 'Copiado';
    } catch {
      output.focus();
      output.select();
      status.textContent = 'Seleccionado · Ctrl/Cmd+C';
    }
    setTimeout(() => { status.textContent = ''; }, 1800);
  }

  function togglePanel() {
    state.open = !state.open;
    panel.hidden = !state.open;
  }

  launcher.addEventListener('click', () => {
    state.open = true;
    panel.hidden = false;
    if (!state.scan) output.value = generatePff();
  });
  close.addEventListener('click', () => {
    state.open = false;
    panel.hidden = true;
  });

  actions.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-action]');
    const action = button?.dataset.action;
    if (!action) return;
    if (action === 'scan') {
      scanPage();
      output.value = generatePff();
    }
    if (action === 'record') {
      state.recording = !state.recording;
      state.lastAction = null;
      renderStats();
      status.textContent = state.recording ? 'Ejecuta el flujo real' : 'Grabación detenida';
    }
    if (action === 'screen') output.value = generateScreenFlow();
    if (action === 'pff') output.value = generatePff();
    if (action === 'json') output.value = exportJson();
    if (action === 'clear') {
      state.events.length = 0;
      state.lastAction = null;
      renderStats();
      output.value = generatePff();
    }
    if (action === 'copy') void copyOutput();
    if (action === 'inspector') {
      try { chrome.runtime.sendMessage({ type: 'ZEN_INSPECTOR_TOGGLE' }); }
      catch { status.textContent = 'Inspector no disponible'; }
    }
  });

  state.scan = scanPage();
  output.value = generatePff();
  renderStats();

  globalThis[API_KEY] = Object.freeze({
    version: '1.0.0',
    toggle: togglePanel,
    scan: scanPage,
    screenFlow: generateScreenFlow,
    pff: generatePff,
    snapshot: exportJson
  });
})();
