'use strict';

(() => {
  const API_KEY = '__ZEN_INSPECTOR_V1__';
  const existing = globalThis[API_KEY];
  if (existing && typeof existing.toggle === 'function') {
    existing.toggle();
    return;
  }

  const HOST_TAG = 'zen-inspector-extension-root';
  const host = document.createElement(HOST_TAG);
  host.setAttribute('aria-hidden', 'true');
  for (const [property, value] of [
    ['all', 'initial'],
    ['position', 'fixed'],
    ['inset', '0'],
    ['display', 'block'],
    ['pointer-events', 'none'],
    ['z-index', '2147483647']
  ]) {
    host.style.setProperty(property, value, 'important');
  }
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .zi-outline {
      position: fixed;
      pointer-events: none;
      border: 2px solid #f6c344;
      background: rgba(246, 195, 68, .10);
      box-shadow: 0 0 0 1px rgba(0,0,0,.5);
      z-index: 2147483645;
    }
    .zi-hud {
      position: fixed;
      left: 12px;
      bottom: 12px;
      max-width: min(640px, calc(100vw - 24px));
      padding: 8px 10px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 8px;
      background: rgba(17,20,23,.96);
      color: #f7f7f7;
      font: 600 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      box-shadow: 0 12px 34px rgba(0,0,0,.35);
      z-index: 2147483646;
      pointer-events: none;
    }
    .zi-panel {
      position: fixed;
      top: 12px;
      right: 12px;
      width: min(460px, calc(100vw - 24px));
      max-height: calc(100vh - 24px);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 12px;
      background: #111417;
      color: #f7f7f7;
      box-shadow: 0 20px 60px rgba(0,0,0,.48);
      font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      z-index: 2147483647;
      pointer-events: auto;
    }
    .zi-panel[data-open="true"] { display: flex; }
    .zi-head, .zi-actions { display: flex; align-items: center; gap: 8px; padding: 12px; }
    .zi-head { justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.12); }
    .zi-brand { display: grid; gap: 2px; min-width: 0; }
    .zi-brand small { color: #b8c0c7; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
    .zi-brand strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .zi-body { display: grid; gap: 10px; min-height: 0; padding: 12px; }
    .zi-log {
      width: 100%;
      min-height: 300px;
      max-height: 58vh;
      resize: vertical;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 8px;
      padding: 10px;
      background: #0a0c0e;
      color: #dfe5ea;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre;
    }
    .zi-note { margin: 0; color: #aeb7bf; font-size: 12px; }
    .zi-actions { justify-content: flex-end; border-top: 1px solid rgba(255,255,255,.12); }
    button {
      appearance: none;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 8px;
      padding: 7px 10px;
      background: #1d2328;
      color: #f7f7f7;
      font: 600 12px/1 system-ui, sans-serif;
      cursor: pointer;
    }
    button:hover { background: #283139; }
    button.zi-primary { border-color: #f6c344; background: #f6c344; color: #17130a; }
    .zi-copy-status { margin-right: auto; color: #b8c0c7; font-size: 12px; }
  `;
  shadow.appendChild(style);

  function make(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  const outline = make('div', 'zi-outline');
  outline.hidden = true;
  const hud = make('div', 'zi-hud');
  hud.hidden = true;
  const panel = make('section', 'zi-panel');
  panel.dataset.open = 'false';

  const head = make('header', 'zi-head');
  const brand = make('div', 'zi-brand');
  brand.append(make('small', '', 'Zen Inspector'), make('strong', '', 'Elemento seleccionado'));
  const closeButton = make('button', '', 'Cerrar');
  closeButton.type = 'button';
  head.append(brand, closeButton);

  const body = make('div', 'zi-body');
  const note = make(
    'p',
    'zi-note',
    'Lectura local. Formularios, valores data-* y parámetros de URL se redactan por defecto.'
  );
  const logField = make('textarea', 'zi-log');
  logField.readOnly = true;
  logField.spellcheck = false;
  body.append(note, logField);

  const actions = make('footer', 'zi-actions');
  const copyStatus = make('span', 'zi-copy-status');
  const copyButton = make('button', 'zi-primary', 'Copiar log');
  copyButton.type = 'button';
  actions.append(copyStatus, copyButton);
  panel.append(head, body, actions);
  shadow.append(outline, hud, panel);

  let active = true;
  let locked = false;
  let currentTarget = null;
  let frame = 0;

  function parentElement(element) {
    if (element.parentElement) return element.parentElement;
    const root = element.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  }

  function escapeCss(value) {
    if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') return globalThis.CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/gu, (character) => {
      const point = character.codePointAt(0);
      return `\\${point === undefined ? '0' : point.toString(16)} `;
    });
  }

  function exactPath(element) {
    if (element.id) return `#${escapeCss(element.id)}`;
    const parts = [];
    let node = element;
    while (node && node !== document.documentElement) {
      if (node.id) {
        parts.unshift(`#${escapeCss(node.id)}`);
        break;
      }
      let part = node.tagName.toLowerCase();
      const stableClasses = [...node.classList]
        .filter((name) => !/^(?:is-|has-|js-|active$|selected$|open$|focus$)/u.test(name))
        .slice(0, 3);
      if (stableClasses.length) part += `.${stableClasses.map(escapeCss).join('.')}`;
      const parent = parentElement(node);
      if (parent) {
        const siblings = [...parent.children].filter((child) => child.tagName === node.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      const root = node.getRootNode();
      if (!node.parentElement && root instanceof ShadowRoot) parts.unshift('>>>');
      node = parent;
      if (parts.length >= 18) break;
    }
    return parts.join(' > ').replace(/>\s*>>>\s*>/gu, '>>>');
  }

  function genericName(element) {
    const explicit = element.getAttribute('data-zen-component') || element.getAttribute('data-component');
    if (explicit) return `<${explicit.replace(/^<|>$/gu, '')}>`;
    if (element.id) return `<DOM#${element.id}>`;
    const role = element.getAttribute('role');
    if (role) return `<DOM.${element.tagName.toLowerCase()}[role=${role}]>`;
    const classes = [...element.classList].slice(0, 2).join('.');
    return `<DOM.${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}>`;
  }

  function resolveTarget(element) {
    let owner = element;
    while (owner) {
      const explicit = owner.getAttribute('data-zen-component') || owner.getAttribute('data-component');
      if (explicit) {
        return {
          name: genericName(element),
          exactPath: exactPath(element),
          ownerName: `<${explicit.replace(/^<|>$/gu, '')}>`,
          ownerPath: exactPath(owner)
        };
      }
      owner = parentElement(owner);
    }
    return { name: genericName(element), exactPath: exactPath(element), ownerName: '', ownerPath: '' };
  }

  function safeUrl(raw) {
    try {
      const parsed = new URL(raw, document.baseURI);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return `${parsed.origin}${parsed.pathname}`;
      if (parsed.protocol === 'file:') return parsed.pathname;
      return `${parsed.protocol}[redacted]`;
    } catch {
      return '[unparseable URL]';
    }
  }

  function interactionInfo(element) {
    const values = [];
    if (element instanceof HTMLAnchorElement) values.push(`href=${safeUrl(element.href)}`);
    if (element instanceof HTMLButtonElement) values.push(`type=${element.type}`);
    if (element instanceof HTMLInputElement) {
      values.push(`input-type=${element.type || 'text'}`);
      values.push(`name=${element.name || '—'}`);
      values.push(`autocomplete=${element.autocomplete || '—'}`);
      values.push(`value-present=${element.value.length > 0 ? 'yes' : 'no'} [value redacted]`);
    }
    if (element instanceof HTMLTextAreaElement) {
      values.push(`name=${element.name || '—'}`);
      values.push(`value-present=${element.value.length > 0 ? 'yes' : 'no'} [value redacted]`);
    }
    if (element instanceof HTMLSelectElement) {
      values.push(`name=${element.name || '—'}`);
      values.push(`selected-index=${element.selectedIndex}`);
      values.push('[selected value redacted]');
    }
    const role = element.getAttribute('role');
    if (role) values.push(`role=${role}`);
    for (const name of ['aria-expanded', 'aria-pressed', 'aria-selected', 'aria-controls']) {
      if (element.hasAttribute(name)) values.push(`${name}=${element.getAttribute(name) || ''}`);
    }
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && !(element instanceof HTMLInputElement && element.type === 'password')) {
      values.push(`aria-label=${ariaLabel.slice(0, 140)}`);
    }
    return values.join(' | ') || 'Sin acción/ARIA específica detectada';
  }

  function datasetInfo(element) {
    if (!(element instanceof HTMLElement)) return 'Sin data-*';
    const keys = Object.keys(element.dataset).slice(0, 20);
    return keys.length ? `Claves: ${keys.join(', ')} [valores no capturados]` : 'Sin data-*';
  }

  function textPreview(element) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) return '[contenido de formulario no capturado]';
    return (element.textContent || '').replace(/\s+/gu, ' ').trim().slice(0, 320) || 'Sin texto visible';
  }

  function componentTree(element) {
    const nodes = [];
    let node = element;
    while (node && node !== document.documentElement) {
      const name = genericName(node);
      if (nodes[nodes.length - 1] !== name) nodes.push(name);
      node = parentElement(node);
      if (nodes.length >= 12) break;
    }
    nodes.reverse();
    return nodes.map((name, index) => index === 0 ? name : `${'  '.repeat(index)}└─ ${name}`).join('\n');
  }

  function buildLog(element) {
    const info = resolveTarget(element);
    const rect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const owner = info.ownerName && info.ownerName !== info.name
      ? `COMPONENTE PROPIETARIO:\n${info.ownerName}\nRuta: ${info.ownerPath}`
      : '';
    return [
      'ZEN INSPECTOR', '',
      'PÁGINA:', safeUrl(location.href), `Título: ${document.title.slice(0, 180) || '—'}`, '',
      'SCOPE:', info.name, '', owner, '',
      'TREE:', componentTree(element), '',
      'DOM:', `Elemento: ${element.tagName.toLowerCase()}`, `Selector exacto: ${info.exactPath}`,
      `ID: ${element.id || '—'}`, `Clases: ${element.getAttribute('class') || '—'}`, '',
      'INTERACCIÓN:', interactionInfo(element), '',
      'VIEWPORT:', `${window.innerWidth} × ${window.innerHeight} px`, '',
      'GEOMETRÍA:', `x: ${Math.round(rect.x)} px`, `y: ${Math.round(rect.y)} px`,
      `width: ${Math.round(rect.width)} px`, `height: ${Math.round(rect.height)} px`, '',
      'LAYOUT:', `display: ${computed.display}`, `position: ${computed.position}`, `z-index: ${computed.zIndex}`,
      `overflow-x: ${computed.overflowX}`, `overflow-y: ${computed.overflowY}`, `gap: ${computed.gap}`, '',
      'BOX MODEL:', `margin: ${computed.margin}`, `padding: ${computed.padding}`, `border: ${computed.border}`,
      `border-radius: ${computed.borderRadius}`, '',
      'TIPOGRAFÍA:', `font-family: ${computed.fontFamily}`, `font-size: ${computed.fontSize}`,
      `font-weight: ${computed.fontWeight}`, `line-height: ${computed.lineHeight}`, `color: ${computed.color}`,
      `background: ${computed.backgroundColor}`, '',
      'DATA:', datasetInfo(element), '',
      'TEXTO:', textPreview(element), '',
      'PRIVACIDAD:', 'No se capturan valores de formularios, valores data-* ni query strings/hash de URLs.', '',
      'PETICIÓN:', '[Escribe aquí qué quieres cambiar.]'
    ].filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n');
  }

  function eventTarget(event) {
    for (const candidate of event.composedPath()) {
      if (candidate instanceof Element) return candidate;
    }
    return event.target instanceof Element ? event.target : null;
  }

  function moveOutline(target) {
    const rect = target.getBoundingClientRect();
    outline.hidden = false;
    outline.style.left = `${Math.max(0, rect.left)}px`;
    outline.style.top = `${Math.max(0, rect.top)}px`;
    outline.style.width = `${Math.max(0, rect.width)}px`;
    outline.style.height = `${Math.max(0, rect.height)}px`;
    const info = resolveTarget(target);
    hud.hidden = false;
    hud.textContent = `${info.name} · ${Math.round(rect.width)}×${Math.round(rect.height)}`;
  }

  function select(target) {
    currentTarget = target;
    locked = true;
    moveOutline(target);
    const info = resolveTarget(target);
    const title = brand.querySelector('strong');
    if (title) title.textContent = info.name;
    logField.value = buildLog(target);
    panel.dataset.open = 'true';
  }

  function clearSelection() {
    locked = false;
    currentTarget = null;
    panel.dataset.open = 'false';
    copyStatus.textContent = '';
  }

  function setActive(next) {
    active = next;
    host.style.setProperty('display', next ? 'block' : 'none', 'important');
    if (!next) {
      clearSelection();
      outline.hidden = true;
      hud.hidden = true;
    }
  }

  function onPointerMove(event) {
    if (!active || locked) return;
    const target = eventTarget(event);
    if (!target || target === host) return;
    currentTarget = target;
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (currentTarget && document.documentElement.contains(currentTarget)) moveOutline(currentTarget);
    });
  }

  function onClick(event) {
    if (!active) return;
    const target = eventTarget(event);
    if (!target || target === host) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    select(target);
  }

  function onKeyDown(event) {
    if (!active || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (locked) clearSelection();
    else {
      outline.hidden = true;
      hud.hidden = true;
    }
  }

  closeButton.addEventListener('click', clearSelection);
  copyButton.addEventListener('click', async () => {
    if (!logField.value) return;
    try {
      await navigator.clipboard.writeText(logField.value);
      copyStatus.textContent = 'Copiado';
    } catch {
      logField.focus();
      logField.select();
      copyStatus.textContent = 'Log seleccionado; usa Ctrl/Cmd+C';
    }
  });
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', () => {
    if (active && currentTarget && document.documentElement.contains(currentTarget)) moveOutline(currentTarget);
  }, { passive: true, capture: true });
  window.addEventListener('resize', () => {
    if (active && currentTarget && document.documentElement.contains(currentTarget)) moveOutline(currentTarget);
  }, { passive: true });

  globalThis[API_KEY] = {
    toggle() { setActive(!active); }
  };
  setActive(true);
})();
