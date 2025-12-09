console.log('Midori Kage Content Script Loaded');

// Internal State
let isScraping = false;
let scrapeLimit = 50;
let scrapedChats = [];
let processedChatNames = new Set();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.action === 'start_scraping') {
    if (isScraping) return;
    isScraping = true;
    scrapeLimit = request.limit || 50;
    scrapedChats = [];
    processedChatNames = new Set();
    startScrapingLoop();
  } else if (request.action === 'stop_scraping') {
    isScraping = false;
    sendStatus('Stopping...', scrapedChats.length, true);
  } else if (request.action === 'download_data') {
    downloadData();
  }
});

// Helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function sendStatus(status, count, done = false) {
  chrome.runtime.sendMessage({
    action: 'status_update',
    status: status,
    count: count,
    done: done,
  });
}

// ---------------------------------------------------------
// Core Logic
// ---------------------------------------------------------

async function startScrapingLoop() {
  sendStatus('Starting...', 0);

  try {
    let consecutiveNoNewChats = 0;

    while (isScraping && scrapedChats.length < scrapeLimit) {
      // 1. Identify visible chat rows
      const rows = Array.from($$(SELECTORS.chat_row));
      let processedAnyInView = false;

      for (const row of rows) {
        if (!isScraping || scrapedChats.length >= scrapeLimit) break;

        // Extract basic info from row without opening
        const titleEl = row.querySelector(SELECTORS.chat_list_title);
        if (!titleEl) continue;

        const rawName = titleEl.innerText.trim();
        const safeName = rawName.replace(/[^a-z0-9 ]/iy, '').trim();
        if (processedChatNames.has(rawName)) continue; // Skip already processed

        // 2. Click and Open Chat
        sendStatus(`Opening: ${rawName}`, scrapedChats.length);

        // Click and wait for transition
        // Use a more human-like click?
        row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        row.click();

        // Wait for header to update
        const headerVerified = await waitForHeaderChange(rawName);
        if (!headerVerified) {
          console.warn(`Header verification failed for ${rawName}. Skipping.`);
          continue;
        }

        // 3. Scrape Data
        processedChatNames.add(rawName);
        processedAnyInView = true;

        // A. Contact Info
        let contactInfo = { name: rawName, about: '' };
        try {
          contactInfo = await scrapeContactInfo();
        } catch (e) {
          console.error('Contact scrape error:', e);
        }

        // B. Messages
        let messages = [];
        try {
          messages = await scrapeMessages();
        } catch (e) {
          console.error('Message scrape error:', e);
        }

        // 4. Save
        scrapedChats.push({
          chat_name: rawName,
          safe_name: safeName,
          contact_info: contactInfo,
          messages: messages,
        });

        sendStatus(`Scraped: ${rawName}`, scrapedChats.length);

        await sleep(1000 + Math.random() * 1000); // Human delay
      }

      // 5. Scroll if needed
      if (!processedAnyInView && isScraping && scrapedChats.length < scrapeLimit) {
        console.log('No new chats in view, scrolling...');
        const chatList = $(SELECTORS.chat_list);
        if (chatList) {
          const previousScrollTop = chatList.scrollTop;
          chatList.scrollTop += 500; // Scroll down
          await sleep(1500); // Wait for load

          if (chatList.scrollTop === previousScrollTop) {
            consecutiveNoNewChats++;
            console.log("Scroll didn't move, maybe end of list?");
          } else {
            consecutiveNoNewChats = 0;
          }

          if (consecutiveNoNewChats > 3) {
            console.log('End of list reached or stuck.');
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Fatal Scraper Error:', error);
    sendStatus('Error detected. Check console.', scrapedChats.length, true);
  }

  isScraping = false;
  sendStatus('Done! Ready to download.', scrapedChats.length, true);
}

// ---------------------------------------------------------
// Sub-functions
// ---------------------------------------------------------

async function waitForHeaderChange(expectedName) {
  // Wait up to 5 seconds for header to contain expectedName
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    const titleEl = $(SELECTORS.header_title_container);
    if (titleEl) {
      const text = titleEl.innerText;
      if (text.includes(expectedName) || expectedName.includes(text)) {
        return true;
      }
    }
    await sleep(500);
  }
  return false;
}

async function scrapeContactInfo() {
  const info = { name: '', about: '' };

  // Click header
  const header = $(SELECTORS.header_title_container);
  if (!header) return info;
  header.click();

  await sleep(1500); // Wait for drawer

  // Name
  const nameEl = $(SELECTORS.contact_info_name);
  if (nameEl) info.name = nameEl.innerText;

  // About
  const aboutEl = $(SELECTORS.contact_info_about);
  if (aboutEl) info.about = aboutEl.innerText; // Might capture phone too

  // Close with Escape
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  );
  await sleep(500);

  // Verify closed? Assume yes for now.
  return info;
}

async function scrapeMessages() {
  // We grab visible messages. For full history we'd need to scroll up repeatedly.
  // For "Shadow/MVP" we grab what is loaded.

  // Check if we need to wait for messages to load?
  await sleep(1000);

  const bubbles = $$(SELECTORS.message_bubble);
  const messages = [];

  bubbles.forEach((bubble) => {
    try {
      const textEl = bubble.querySelector(SELECTORS.message_text);
      const infoEl = bubble.querySelector(SELECTORS.message_info);

      let text = textEl ? textEl.innerText : '';
      let info = infoEl ? infoEl.getAttribute('data-pre-plain-text') : '';

      if (text || info) {
        messages.push({
          info: info ? info.trim() : '',
          text: text ? text.trim() : '',
        });
      }
    } catch (_e) {
      // Skip
    }
  });

  return messages;
}

function downloadData() {
  const dataStr =
    'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scrapedChats, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute(
    'download',
    `whatsapp_scrape_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
