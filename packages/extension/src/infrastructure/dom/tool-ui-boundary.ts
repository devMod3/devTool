import { DEVTOOL_UI_ATTR } from '../../shared/constants';

export class ToolUiBoundary {
  public mark(element: HTMLElement): void {
    element.setAttribute(DEVTOOL_UI_ATTR, 'true');
  }

  public isToolEvent(event: Event): boolean {
    return event.composedPath().some((candidate) => {
      if (!(candidate instanceof Element)) return false;
      return (
        candidate.hasAttribute(DEVTOOL_UI_ATTR) ||
        candidate.closest(`[${DEVTOOL_UI_ATTR}]`) !== null
      );
    });
  }

  public isToolElement(element: Element): boolean {
    return (
      element.hasAttribute(DEVTOOL_UI_ATTR) || element.closest(`[${DEVTOOL_UI_ATTR}]`) !== null
    );
  }
}
