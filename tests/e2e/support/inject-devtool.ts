interface ExtensionRuntimeWorker {
  evaluate(pageFunction: () => Promise<void>): Promise<void>;
}

export async function injectDevTool(extensionWorker: ExtensionRuntimeWorker): Promise<void> {
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
