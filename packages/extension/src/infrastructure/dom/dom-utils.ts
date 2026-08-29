import type { ControlDescriptor, ControlKind } from '@devtool/core';

const MAX_TEXT = 120;

export function safeUrl(raw: unknown): string {
  try {
    const url = new URL(String(raw ?? ''), document.baseURI);
    if (url.protocol === 'http:' || url.protocol === 'https:')
      return `${url.origin}${url.pathname}`;
    if (url.protocol === 'file:') return url.pathname;
    return `${url.protocol}[redacted]`;
  } catch {
    return '[unparseable URL]';
  }
}

export function cleanText(value: unknown, max = MAX_TEXT): string {
  return String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, max);
}

function cssEscape(value: string): string {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return value.replace(
    /[^a-zA-Z0-9_-]/gu,
    (character) => `\\${character.codePointAt(0)?.toString(16) ?? '0'} `,
  );
}

export function exactPath(element: Element): string {
  if (element.id) return `#${cssEscape(element.id)}`;
  const parts: string[] = [];
  let node: Element | null = element;
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
      const peers = [...parent.children].filter((child) => child.tagName === node?.tagName);
      if (peers.length > 1) part += `:nth-of-type(${peers.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
}

export function visible(element: Element): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true')
    return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function labelFor(element: Element): string {
  const aria = cleanText(element.getAttribute('aria-label'));
  if (aria) return aria;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/u)
      .map((id) => cleanText(document.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    const explicit = element.id
      ? document.querySelector(`label[for="${cssEscape(element.id)}"]`)
      : null;
    const label = cleanText(explicit?.textContent ?? element.closest('label')?.textContent);
    if (label) return label;
    if (element.placeholder) return cleanText(element.placeholder);
    if (element.name) return element.name;
  }
  return (
    cleanText(element.textContent) ||
    cleanText(element.getAttribute('title')) ||
    element.id ||
    element.tagName.toLowerCase()
  );
}

export function roleFor(element: Element): string {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  if (element instanceof HTMLButtonElement) return 'button';
  if (element instanceof HTMLAnchorElement) return 'link';
  if (element instanceof HTMLSelectElement) return 'select';
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') return 'checkbox';
    if (element.type === 'radio') return 'radio';
    return 'input';
  }
  if (element instanceof HTMLDialogElement) return 'dialog';
  return element.tagName.toLowerCase();
}

export function actionKind(element: Element): ControlKind {
  if (element instanceof HTMLAnchorElement) return 'navigate';
  if (element instanceof HTMLButtonElement) {
    if (element.type === 'submit') return 'submit';
    if (element.hasAttribute('aria-expanded') || element.hasAttribute('aria-pressed'))
      return 'toggle';
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

export function dynamicState(element: Element): readonly string[] {
  const values: string[] = [];
  for (const name of [
    'aria-expanded',
    'aria-selected',
    'aria-pressed',
    'aria-current',
    'aria-invalid',
  ]) {
    if (element.hasAttribute(name)) values.push(`${name}=${element.getAttribute(name)}`);
  }
  if ('disabled' in element && Boolean(element.disabled)) values.push('disabled=true');
  if (
    element instanceof HTMLInputElement &&
    (element.type === 'checkbox' || element.type === 'radio')
  ) {
    values.push(`checked=${String(element.checked)}`);
  }
  if (element instanceof HTMLDetailsElement) values.push(`open=${String(element.open)}`);
  return values;
}

export function controlDescriptor(element: Element): ControlDescriptor {
  const base = {
    selector: exactPath(element),
    role: roleFor(element),
    label: labelFor(element),
    kind: actionKind(element),
    required:
      'required' in element
        ? Boolean(element.required)
        : element.getAttribute('aria-required') === 'true',
    state: dynamicState(element),
  } satisfies Omit<ControlDescriptor, 'target'>;

  if (element instanceof HTMLAnchorElement) return { ...base, target: safeUrl(element.href) };
  const controls = element.getAttribute('aria-controls');
  if (controls) return { ...base, target: `#${controls}` };
  return base;
}

export function firstElementFromEvent(event: Event): Element | null {
  return (
    event.composedPath().find((candidate): candidate is Element => candidate instanceof Element) ??
    null
  );
}
