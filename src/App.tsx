import { useEffect, useState } from 'react';

// Types
interface ScrapingRequest {
  action: 'start_scraping' | 'stop_scraping' | 'download_data';
  limit?: number;
  skipPinned?: boolean;
  skipGroups?: boolean;
}

interface StatusMessage {
  action: 'status_update';
  status: string;
  count: number;
  done: boolean;
}

function App() {
  const [isScraping, setIsScraping] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [progressCount, setProgressCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [skipPinned, setSkipPinned] = useState(false);
  const [skipGroups, setSkipGroups] = useState(false);
  const [canDownload, setCanDownload] = useState(false);

  // Load state on mount
  useEffect(() => {
    chrome.storage.local.get(['isScraping', 'scrapeCount'], (result: { isScraping?: boolean; scrapeCount?: number }) => {
      if (result.isScraping) {
        setIsScraping(true);
        setStatusText('Resuming...');
      }
      if (result.scrapeCount !== undefined) {
        setProgressCount(result.scrapeCount);
      }
    });

    // Listen for messages from content script
    const listener = (
      message: StatusMessage, 
      _sender: chrome.runtime.MessageSender, 
      _sendResponse: (response?: unknown) => void
    ) => {
      if (message.action === 'status_update') {
        setStatusText(message.status);
        if (message.count !== undefined) {
          setProgressCount(message.count);
        }
        if (message.done) {
          setIsScraping(false);
          setCanDownload(true);
          chrome.storage.local.set({ isScraping: false });
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      setStatusText('Error: No active tab');
      return;
    }

    const payload: ScrapingRequest = {
      action: 'start_scraping',
      limit,
      skipPinned,
      skipGroups
    };

    chrome.tabs.sendMessage(tabs[0].id, payload, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        setStatusText('Error: Refresh Page');
      } else {
        console.log('Response:', response);
        setIsScraping(true);
        setCanDownload(false);
        setStatusText('Scraping started...');
        chrome.storage.local.set({ isScraping: true });
      }
    });
  };

  const handleStop = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stop_scraping' });
      setIsScraping(false);
      setStatusText('Stopped by user');
      chrome.storage.local.set({ isScraping: false });
    }
  };

  const handleDownload = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'download_data' });
    }
  };

  return (
    <div className="container">
      <h2>Midori Kage (TS)</h2>
      
      <div className="controls">
        <button 
          className="btn primary" 
          onClick={handleStart} 
          disabled={isScraping}
        >
          Start Scraping
        </button>
        <button 
          className="btn danger" 
          onClick={handleStop} 
          disabled={!isScraping}
        >
          Stop
        </button>
        <button 
          className="btn secondary" 
          onClick={handleDownload} 
          disabled={!canDownload && isScraping}
        >
          Download JSON
        </button>
      </div>

      <div className="control-group">
        <label>
          <input 
            type="checkbox" 
            checked={skipPinned} 
            onChange={(e) => setSkipPinned(e.target.checked)} 
          /> Skip Pinned
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={skipGroups} 
            onChange={(e) => setSkipGroups(e.target.checked)} 
          /> Skip Groups
        </label>
      </div>

      <div className="status-box">
        <div id="statusText">{statusText}</div>
        <div id="progress">{progressCount} chats scraped</div>
      </div>

      <div className="settings">
        <label>
          Limit: 
          <input 
            type="number" 
            value={limit} 
            onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
            style={{ width: '50px', marginLeft: '5px' }} 
          />
        </label>
      </div>
    </div>
  );
}

export default App;
