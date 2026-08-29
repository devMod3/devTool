import type {
  FormDescriptor,
  PageScan,
  ScannerPort,
  StateDescriptor,
  SurfaceDescriptor,
} from '@devtool/core';
import {
  cleanText,
  controlDescriptor,
  dynamicState,
  exactPath,
  labelFor,
  roleFor,
  safeUrl,
  visible,
} from './dom-utils';
import type { ToolUiBoundary } from './tool-ui-boundary';

export class BrowserScanner implements ScannerPort {
  public constructor(private readonly boundary: ToolUiBoundary) {}

  public scan(): PageScan {
    return {
      generatedAt: new Date().toISOString(),
      page: {
        title: cleanText(document.title, 180),
        url: safeUrl(location.href),
        viewport: `${innerWidth}×${innerHeight}`,
      },
      surfaces: this.scanSurfaces(),
      controls: this.scanControls(),
      forms: this.scanForms(),
      states: this.scanStates(),
    };
  }

  private scanControls() {
    return [
      ...document.querySelectorAll(
        'a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="switch"]',
      ),
    ]
      .filter((element) => visible(element) && !this.boundary.isToolElement(element))
      .map(controlDescriptor);
  }

  private scanForms(): readonly FormDescriptor[] {
    return [...document.forms]
      .filter((form) => visible(form) && !this.boundary.isToolElement(form))
      .map((form) => ({
        selector: exactPath(form),
        label: labelFor(form),
        method: String(form.method || 'get').toUpperCase(),
        action: safeUrl(form.action || location.href),
        requiredFields: [...form.elements]
          .filter((field): field is HTMLElement => field instanceof HTMLElement)
          .filter(
            (field) =>
              ('required' in field && Boolean(field.required)) ||
              field.getAttribute('aria-required') === 'true',
          )
          .map(labelFor),
      }));
  }

  private scanSurfaces(): readonly SurfaceDescriptor[] {
    return [
      ...document.querySelectorAll(
        'main,nav,aside,dialog,[role="dialog"],[role="tabpanel"],section[aria-label],form',
      ),
    ]
      .filter((element) => visible(element) && !this.boundary.isToolElement(element))
      .slice(0, 80)
      .map((element) => ({
        selector: exactPath(element),
        kind: roleFor(element),
        label:
          cleanText(element.querySelector('h1,h2,h3,[role="heading"]')?.textContent) ||
          labelFor(element),
      }));
  }

  private scanStates(): readonly StateDescriptor[] {
    return [
      ...document.querySelectorAll(
        '[role="status"],[role="alert"],[aria-live],dialog[open],[aria-selected="true"],[aria-expanded]',
      ),
    ]
      .filter((element) => visible(element) && !this.boundary.isToolElement(element))
      .slice(0, 100)
      .map((element) => ({
        selector: exactPath(element),
        role: roleFor(element),
        label: labelFor(element),
        state: dynamicState(element),
        text: element.matches('input,textarea,select')
          ? '[value redacted]'
          : cleanText(element.textContent, 180),
      }));
  }
}
