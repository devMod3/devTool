import type { Worker } from '@playwright/test';
import { expect, test } from './fixtures';

async function injectDevTool(extensionWorker: Worker): Promise<void> {
  await extensionWorker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (typeof tab?.id !== 'number') throw new Error('Active tab not found');
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['page-probe.js'],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  });
}

test('Inspector can be disabled from DevTool without trapping clicks', async ({
  context,
  extensionWorker,
}) => {
  const page = await context.newPage();
  await page.goto('/fixtures/inspector');
  await page.bringToFront();
  await injectDevTool(extensionWorker);

  const devTool = page.locator('zen-devtool-root');
  await expect(devTool).toBeAttached();
  const inspector = devTool.getByRole('button', { name: 'Inspector · OFF' });
  await inspector.click();
  await expect(devTool.getByRole('button', { name: 'Inspector · ON' })).toBeVisible();

  const target = page.getByTestId('target-action');
  await target.click();
  await expect(page.getByTestId('target-count')).toHaveText('0');

  await devTool.getByRole('button', { name: 'Inspector · ON' }).click();
  await expect(devTool.getByRole('button', { name: 'Inspector · OFF' })).toBeVisible();
  await target.click();
  await expect(page.getByTestId('target-count')).toHaveText('1');
});

test('Escape is a guaranteed Inspector exit and private input values stay out of snapshots', async ({
  context,
  extensionWorker,
}) => {
  const page = await context.newPage();
  await page.goto('/fixtures/inspector');
  await page.bringToFront();
  await injectDevTool(extensionWorker);

  const devTool = page.locator('zen-devtool-root');
  await devTool.getByRole('button', { name: 'Inspector · OFF' }).click();
  await page.keyboard.press('Escape');
  await expect(devTool.getByRole('button', { name: 'Inspector · OFF' })).toBeVisible();

  await devTool.getByRole('button', { name: 'JSON' }).click();
  const value = await devTool.locator('textarea.zf-output').inputValue();
  expect(value).not.toContain('dato privado de prueba');
  expect(value).toContain('"required": true');
});

test('DevTool window can move without losing controls or leaving the viewport', async ({
  context,
  extensionWorker,
}) => {
  const page = await context.newPage();
  await page.goto('/fixtures/inspector');
  await page.bringToFront();
  await injectDevTool(extensionWorker);

  const devTool = page.locator('zen-devtool-root');
  const panel = devTool.locator('.zf-panel');
  const handle = devTool.locator('.zf-drag-handle');
  await expect(handle).toContainText('Mover');

  const before = await panel.boundingBox();
  const handleBox = await handle.boundingBox();
  if (!before || !handleBox) throw new Error('DevTool window is not measurable');

  await page.mouse.move(handleBox.x + 40, handleBox.y + 18);
  await page.mouse.down();
  await page.mouse.move(handleBox.x - 120, handleBox.y - 100, { steps: 6 });
  await page.mouse.up();

  const afterDrag = await panel.boundingBox();
  if (!afterDrag) throw new Error('DevTool window disappeared after drag');
  expect(afterDrag.x).toBeLessThan(before.x);
  expect(afterDrag.y).toBeLessThan(before.y);
  expect(afterDrag.x).toBeGreaterThanOrEqual(0);
  expect(afterDrag.y).toBeGreaterThanOrEqual(0);

  await handle.focus();
  await page.keyboard.press('Alt+ArrowLeft');
  const afterKeyboard = await panel.boundingBox();
  if (!afterKeyboard) throw new Error('DevTool window disappeared after keyboard move');
  expect(afterKeyboard.x).toBeLessThanOrEqual(afterDrag.x);

  await devTool.getByRole('button', { name: 'JSON' }).click();
  const output = await devTool.locator('textarea.zf-output').inputValue();
  expect(output).toContain('"required": true');
});
