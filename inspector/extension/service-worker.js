'use strict';

async function toggleInspector(tab) {
  if (!tab || typeof tab.id !== 'number') return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (error) {
    console.warn('Zen Inspector no puede ejecutarse en esta página.', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
  void toggleInspector(tab);
});
