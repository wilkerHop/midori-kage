import { createScraperEngine } from '../core/engine';
// Actually, downloadData should be extracted to 'DataExporter' or 'utils' 
// Let's create a small local one or import { createScraperEngine } from '../core/engine';

console.log('[Midori Kage TS] Content Script Loaded');

const engine = createScraperEngine();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'start_scraping') {
       engine.start(request);
       sendResponse({ status: 'started' });
  } else if (request.action === 'stop_scraping') {
       engine.stop();
  } else if (request.action === 'download_data') {
       // Ideally Engine manages data, so it should expose a download method or data
       const data = engine.getStatus().chats;
       const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
       const downloadAnchorNode = document.createElement('a');
       downloadAnchorNode.setAttribute('href', dataStr);
       downloadAnchorNode.setAttribute('download', `whatsapp_scrape_${new Date().toISOString().slice(0, 10)}.json`);
       document.body.appendChild(downloadAnchorNode);
       downloadAnchorNode.click();
       downloadAnchorNode.remove();
  }
});
