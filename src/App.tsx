import { useEffect, useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { StatusPanel } from './components/StatusPanel';
import { ScrapingRequest, StatusMessage } from './types';

function App() {
  const [isScraping, setIsScraping] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [progressCount, setProgressCount] = useState(0);
  const [limit, setLimit] = useState(50);
  const [skipPinned, setSkipPinned] = useState(false);
  const [skipGroups, setSkipGroups] = useState(false);
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['isScraping', 'scrapeCount'], (result: { isScraping?: boolean; scrapeCount?: number }) => {
      if (result.isScraping) {
        setIsScraping(true);
        setStatusText('Resuming...');
      }
      if (result.scrapeCount !== undefined) setProgressCount(result.scrapeCount);
    });

    const listener = (
      message: StatusMessage, 
      _sender: chrome.runtime.MessageSender, 
      _sendResponse: (response?: unknown) => void
    ) => {
      if (message.action === 'status_update') {
        setStatusText(message.status);
        if (message.count !== undefined) setProgressCount(message.count);
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
    if (!tabs[0]?.id) return setStatusText('Error: No active tab');

    const payload: ScrapingRequest = { action: 'start_scraping', limit, skipPinned, skipGroups };
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
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'download_data' });
  };

  return (
    <div className="container">
      <h2>Midori Kage (TS)</h2>
      <ControlPanel 
        isScraping={isScraping} canDownload={canDownload}
        onStart={handleStart} onStop={handleStop} onDownload={handleDownload} 
      />
      <SettingsPanel 
        limit={limit} skipPinned={skipPinned} skipGroups={skipGroups}
        onLimitChange={setLimit} onSkipPinnedChange={setSkipPinned} onSkipGroupsChange={setSkipGroups}
      />
      <StatusPanel statusText={statusText} progressCount={progressCount} />
    </div>
  );
}

export default App;
