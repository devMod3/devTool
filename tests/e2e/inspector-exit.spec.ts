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

test('Inspector can be disabled from DevTool without trapping clicks', async ({ context, extensionWorker }) => {
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

test('Escape is a guaranteed Inspector exit and private input values stay out of snapshots', async ({ context, extensionWorker }) => {
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
