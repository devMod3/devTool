import { chromium, test as base, type BrowserContext, type Worker } from '@playwright/test';
import { join } from 'node:path';

export const test = base.extend<{
  context: BrowserContext;
  extensionWorker: Worker;
}>({
  context: async ({}, use) => {
    const extensionPath = join(process.cwd(), 'packages/extension/dist');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      baseURL: 'http://127.0.0.1:3000',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionWorker: async ({ context }, use) => {
    let worker = context.serviceWorkers()[0];
    worker ??= await context.waitForEvent('serviceworker');
    await use(worker);
  },
});

export const expect = test.expect;
