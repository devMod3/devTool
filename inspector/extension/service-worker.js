'use strict';

async function injectFlowMapper(tab) {
  if (!tab || typeof tab.id !== 'number') return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['page-probe.js']
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['flow.js']
    });
  } catch (error) {
    console.warn('Zen DevTool no puede ejecutarse en esta página.', error);
  }
}

async function toggleInspector(tabId) {
  if (typeof tabId !== 'number') return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (error) {
    console.warn('Zen Inspector no puede ejecutarse en esta página.', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
  void injectFlowMapper(tab);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'ZEN_INSPECTOR_TOGGLE') return;
  void toggleInspector(sender.tab?.id);
});
