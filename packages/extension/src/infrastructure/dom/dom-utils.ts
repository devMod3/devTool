import type { ControlDescriptor, ControlKind } from '@devtool/core';

const MAX_TEXT = 120;

export function safeUrl(raw: string | URL): string {
  try {
    const url = new URL(raw, document.baseURI);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.origin}${url.pathname}`;
    }
    if (url.protocol === 'file:') return url.pathname;
    return `${url.protocol}[redacted]`;
  } catch {
    return '[unparseable URL]';
  }
}

export function cleanText(value: string | null | undefined, max = MAX_TEXT): string {
  return (value ?? '').replace(/\s+/gu, ' ').trim().slice(0, max);
}

function cssEscape(value: string): string {
  return CSS.escape(value);
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
    const stable = Array.from(node.classList)
      .filter((name) => !/^(?:is-|has-|js-|active$|selected$|open$|focus$)/u.test(name))
      .slice(0, 2);
    if (stable.length) part += `.${stable.map(cssEscape).join('.')}`;
    const parent: Element | null = node.parentElement;
    if (parent) {
      const tagName = node.tagName;
      const peers = Array.from(parent.children).filter((child) => child.tagName === tagName);
      if (peers.length > 1) {
        const position = peers.indexOf(node) + 1;
        part += `:nth-of-type(${String(position)})`;
      }
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(' > ');
}

export function visible(element: Element): boolean {
  if (element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function labelledByText(element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (!labelledBy) return '';
  return labelledBy
    .split(/\s+/u)
    .map((id) => cleanText(document.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ');
}

function isFormControl(
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function formControlLabel(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
): string {
  const explicit = element.id
    ? document.querySelector<HTMLLabelElement>(`label[for="${cssEscape(element.id)}"]`)
    : null;
  const label = cleanText(explicit?.textContent ?? element.closest('label')?.textContent);
  if (label) return label;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const placeholder = cleanText(element.placeholder);
    if (placeholder) return placeholder;
  }
  return element.name;
}

export function labelFor(element: Element): string {
  const aria = cleanText(element.getAttribute('aria-label'));
  if (aria) return aria;
  const labelled = labelledByText(element);
  if (labelled) return labelled;
  if (isFormControl(element)) {
    const controlLabel = formControlLabel(element);
    if (controlLabel) return controlLabel;
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

function buttonActionKind(button: HTMLButtonElement): ControlKind {
  if (button.type === 'submit') return 'submit';
  if (button.hasAttribute('aria-expanded') || button.hasAttribute('aria-pressed')) return 'toggle';
  return 'action';
}

function inputActionKind(input: HTMLInputElement): ControlKind {
  if (input.type === 'checkbox' || input.type === 'radio') return 'toggle';
  if (input.type === 'submit' || input.type === 'button') return 'action';
  return 'input';
}

export function actionKind(element: Element): ControlKind {
  if (element instanceof HTMLAnchorElement) return 'navigate';
  if (element instanceof HTMLButtonElement) return buttonActionKind(element);
  if (element instanceof HTMLSelectElement) return 'select';
  if (element instanceof HTMLTextAreaElement) return 'input';
  if (element instanceof HTMLInputElement) return inputActionKind(element);
  if (element.tagName === 'SUMMARY') return 'toggle';
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
    const value = element.getAttribute(name);
    if (value !== null) values.push(`${name}=${value}`);
  }
  if (element instanceof HTMLButtonElement && element.disabled) values.push('disabled=true');
  if (isFormControl(element) && element.disabled) values.push('disabled=true');
  if (
    element instanceof HTMLInputElement &&
    (element.type === 'checkbox' || element.type === 'radio')
  ) {
    values.push(`checked=${String(element.checked)}`);
  }
  if (element instanceof HTMLDetailsElement) values.push(`open=${String(element.open)}`);
  return values;
}

function isRequired(element: Element): boolean {
  if (isFormControl(element)) return element.required;
  return element.getAttribute('aria-required') === 'true';
}

export function controlDescriptor(element: Element): ControlDescriptor {
  const base = {
    selector: exactPath(element),
    role: roleFor(element),
    label: labelFor(element),
    kind: actionKind(element),
    required: isRequired(element),
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
