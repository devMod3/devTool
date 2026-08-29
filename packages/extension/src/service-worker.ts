async function injectDevTool(tab: chrome.tabs.Tab): Promise<void> {
  if (typeof tab.id !== 'number') return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['page-probe.js'],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  } catch (error) {
    console.warn('Zen DevTool no puede ejecutarse en esta página.', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
  void injectDevTool(tab);
});
