document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statusText = document.getElementById('statusText');
  const progressText = document.getElementById('progress');
  const limitInput = document.getElementById('limitInput');

  // Load state if exists
  chrome.storage.local.get(['isScraping', 'scrapeCount'], (result) => {
    if (result.isScraping) {
      setRunningState(true);
    }
    if (result.scrapeCount) {
      progressText.textContent = `${result.scrapeCount} chats scraped`;
    }
  });

  startBtn.addEventListener('click', () => {
    const limit = parseInt(limitInput.value) || 50;

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'start_scraping',
        limit: limit,
      });
      setRunningState(true);
      statusText.textContent = 'Scraping started...';
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stop_scraping',
      });
      setRunningState(false);
      statusText.textContent = 'Stopped by user';
    });
  });

  downloadBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'download_data',
      });
    });
  });

  // Listen for status updates from content script
  chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.action === 'status_update') {
      statusText.textContent = request.status;
      if (request.count !== undefined) {
        progressText.textContent = `${request.count} chats scraped`;
      }
      if (request.done) {
        setRunningState(false);
        downloadBtn.disabled = false;
      }
    }
  });

  function setRunningState(isRunning) {
    if (isRunning) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      downloadBtn.disabled = true;
      chrome.storage.local.set({ isScraping: true });
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      // downloadBtn might remain disabled until data is ready, handled by status update
      chrome.storage.local.set({ isScraping: false });
    }
  }
});

if (typeof module !== 'undefined') {
  module.exports = {};
}
