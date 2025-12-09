console.log('Midori Kage Content Script Loaded');

const SELECTORS = {
  chat_list: '#pane-side', // More robust than aria-label which is localized
  chat_row: 'div[role="row"]',
  chat_list_title: 'span[title]', // relative to row
  header_title_container: '#main header span[title]',

  // Message selectors
  message_container: 'div[role="application"]', // Main chat area
  message_bubble: 'div[role="row"]', // Individual messages
  message_text: 'span.selectable-text',
  message_info: 'div[data-pre-plain-text]',

  // Contact Info
  contact_info_name: "section span[dir='auto']",
  contact_info_about: 'span[title]',
  contact_drawer_close_btn: "div[aria-label='Close']",
};

// Internal State
let isScraping = false;
let scrapeLimit = 50;
let scrapedChats = [];
let processedChatNames = new Set();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('[Content] Message received:', request.action);

  if (request.action === 'start_scraping') {
    if (isScraping) {
      console.warn('[Content] Already scraping, ignoring start request.');
      return;
    }
    console.log('[Content] Starting scraping loop with limit:', request.limit);
    isScraping = true;
    scrapeLimit = request.limit || 50;
    scrapedChats = [];
    processedChatNames = new Set();
    startScrapingLoop(request);
    sendResponse({ status: 'started' }); // Acknowledge
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
  try {
    chrome.runtime.sendMessage(
      {
        action: 'status_update',
        status: status,
        count: count,
        done: done,
      },
      (_response) => {
        if (chrome.runtime.lastError) {
          // Popup closed, ignore
        }
      }
    );
  } catch (_e) {
    // Ignore
  }
}

// ---------------------------------------------------------
// Core Logic
// ---------------------------------------------------------

async function startScrapingLoop(request) {
  sendStatus('Starting...', 0);

  try {
    let consecutiveNoNewChats = 0;

    // State for filtering
    const skipPinned = request.skipPinned || false;
    const skipGroups = request.skipGroups || false;

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

        // --- FILTER: SKIP PINNED ---
        if (skipPinned) {
          // Check for pinned icon (aria-label="Pinned" or specific icon)
          // Use a broad check for "pin" icon in SVG or aria label
          if (
            row.querySelector('span[data-icon="pinned"]') ||
            row.querySelector('span[data-icon="pin"]')
          ) {
            console.log(`[Filter] Skipping Pinned chat: ${rawName}`);
            processedChatNames.add(rawName);
            continue;
          }
        }

        // --- FILTER: SKIP GROUPS (Heuristic on Row) ---
        // If we can identify groups from the row, great. Often they have a specific default icon if no photo.
        // But reliably, we check after opening.

        // 2. Open Chat (Strategy: Mouse Click)
        sendStatus(`Opening: ${rawName}`, scrapedChats.length);

        // Strategy: Robust Mouse Click on the Row
        const clickEventOpts = { bubbles: true, cancelable: true, view: window };

        row.dispatchEvent(new MouseEvent('mousedown', clickEventOpts));
        row.dispatchEvent(new MouseEvent('mouseup', clickEventOpts));
        row.click();

        // Wait for header to update
        const headerVerified = await waitForHeaderChange(rawName);
        if (!headerVerified) {
          console.warn(`Header verification failed for ${rawName}.`);
          continue;
        }

        // --- FILTER: SKIP GROUPS (After Open) ---
        if (skipGroups) {
          // Check header text for common group indicators or click "Group info" later
          // Heuristic: If header subtext contains names (Alice, Bob...) it's a group.
          // Or look for specific group UI elements.
          // Safe check: scrapeContactInfo will tell us if it's a group.
          // Let's implement a quick check here:
          const clickForGroup = document.querySelector('span[title="Click here for group info"]');
          if (clickForGroup) {
            console.log(`[Filter] Skipping Group (header detect): ${rawName}`);
            processedChatNames.add(rawName);
            continue;
          }
        }

        // 3. Scrape Data
        processedChatNames.add(rawName);
        processedAnyInView = true;

        // A. Contact Info
        let contactInfo = { name: rawName, about: '' };
        try {
          contactInfo = await scrapeContactInfo();

          if (skipGroups && contactInfo.isGroup) {
            console.log(`[Filter] Skipping Group (drawer detect): ${rawName}`);
            // Don't save this chat
            continue;
          }
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
        const chatList = $(SELECTORS.chat_list) || document.querySelector('#pane-side'); // Fallback to ID

        if (chatList) {
          const previousScrollTop = chatList.scrollTop;
          // Increase scroll amount to ensure we trigger load
          chatList.scrollTop += 600;

          console.log(
            `[Scroll] Attempting to scroll. Top: ${previousScrollTop} -> ${chatList.scrollTop}`
          );
          await sleep(2000); // Wait longer for network load

          if (chatList.scrollTop === previousScrollTop) {
            consecutiveNoNewChats++;
            console.log(
              `[Scroll] Position didn't change (${consecutiveNoNewChats}/3). End of list?`
            );
          } else {
            consecutiveNoNewChats = 0;
            console.log('[Scroll] Position updated.');
          }

          if (consecutiveNoNewChats > 3) {
            console.log('[Scroll] End of list reached or stuck.');
            break;
          }
        } else {
          console.error(
            '[Scroll] Fatal: Could not find chat list container (#pane-side or aria-label).'
          );
          // If we can't scroll, we must break to avoid infinite loop
          break;
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
  const maxRetries = 10;
  const normalize = (str) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const normalizedExpected = normalize(expectedName);

  for (let i = 0; i < maxRetries; i++) {
    // Strategy: Broadest Check - Is the name anywhere in the #main right pane?
    // This assumes #main is the container for the active chat.
    let mainEl = document.querySelector('#main');

    // Fallback: If #main is renamed/missing, find the parent of the input box
    if (!mainEl) {
      const input = document.querySelector('div[role="textbox"]');
      if (input) {
        // Usually input -> footer -> main -> app
        // Traverse up to find a large container
        mainEl =
          input.closest('main') || input.closest('div[data-testid="conversation-panel-wrapper"]');
        // Or just check if input is visible, we act as if "main" is the document body part on right
      }
    }

    if (mainEl) {
      // We grab the first 500 chars to avoid reading all messages
      // The header info should be at the top.
      const topText = mainEl.innerText.substring(0, 1000);
      const normalizedText = normalize(topText);

      if (normalizedText.includes(normalizedExpected)) {
        return true;
      }

      // Log on failure
      if (i === maxRetries - 1) {
        console.log(
          `[Verify Fail] Expected '${normalizedExpected}' in #main (top 1000 chars). Found: ${normalizedText.substring(0, 50)}...`
        );
      }
    } else {
      // If #main doesn't exist, chat isn't open
      if (i === maxRetries - 1) {
        console.log(`[Verify Fail] Element #main not found.`);
      }
    }

    // Fallback: Check for 'textbox' (Input) to at least confirm A chat is open
    // This is useful if the name matching is tricky (e.g. typos, emojis)
    if (i > 5) {
      const input = document.querySelector('div[role="textbox"]');
      if (input && window.getComputedStyle(input).visibility !== 'hidden') {
        // A chat is open. If we can't match name, maybe we trust it?
        // Let's log a warning but return true to unblock
        if (i === maxRetries - 1) {
          console.warn(
            `[Verify Warn] Name mismatch but Chat Input found. Assuming success for '${expectedName}'.`
          );
          return true;
        }
      }
    }

    await sleep(500);
  }
  return false;
}

async function scrapeContactInfo() {
  const info = { name: '', about: '', isGroup: false };

  // Click header
  const header = $(SELECTORS.header_title_container);
  if (header) {
    header.click();
  } else {
    // Fallback click on header container
    const head = $('#main header');
    if (head) head.click();
  }

  await sleep(2000); // Wait for drawer

  // Check if it's a group
  // Groups usually have "Group info" title in the drawer
  // Or check if "Exit group" button is present
  const drawer =
    document.querySelector('div[role="navigation"]') || document.querySelector('section');

  if (drawer) {
    if (drawer.innerText.includes('Group info') || drawer.innerText.includes('Dados do grupo')) {
      info.isGroup = true;
      // If we want to skip groups, return triggers the filter
    }

    // Name
    const nameEl = drawer.querySelector(SELECTORS.contact_info_name) || drawer.querySelector('h2');
    if (nameEl) info.name = nameEl.innerText;

    // About / Phone
    const spans = Array.from(drawer.querySelectorAll('span'));
    // Heuristic: Looking for phone number pattern or "About" section
    // Often the phone is the first span with a + or numbers after the name
    const phoneRegex = /\+?\d[\d\s-]{8,}/;
    const phoneSpan = spans.find((s) => phoneRegex.test(s.innerText) && s.innerText.length < 30);
    if (phoneSpan) {
      info.about = phoneSpan.innerText; // Treat phone as 'about/details'
    } else {
      // Fallback to about selector
      const aboutEl = drawer.querySelector(SELECTORS.contact_info_about);
      if (aboutEl) info.about = aboutEl.innerText;
    }
  }

  // Close with Escape
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  );
  await sleep(500);

  return info;
}

async function scrapeMessages() {
  // Grab messages from the main application container
  await sleep(1000);

  let container = document.querySelector(SELECTORS.message_container);

  // Method 2: Fallback - look for the 'focus-lock-parent' or similar structure
  // or simply find where the message rows are.
  if (!container) {
    // Find ANY div that looks like the message list (contains rows and is in right pane)
    const allRows = Array.from(document.querySelectorAll('div[role="row"]'));
    // Filter rows that are in the right pane
    const threshold = window.innerWidth * 0.35;
    const rightPaneRows = allRows.filter((r) => r.getBoundingClientRect().left > threshold);

    if (rightPaneRows.length > 0) {
      // The container is likely the parent of these rows
      container = rightPaneRows[0].parentElement;
      console.log('[Scraper] Found fallback message container via rows.');
    }
  }

  if (!container) {
    console.warn('Message container not found (strict or fallback).');
    return [];
  }

  // Scoped query for bubbles
  const bubbles = container.querySelectorAll(SELECTORS.message_bubble);
  const messages = [];

  bubbles.forEach((bubble) => {
    try {
      const textEl =
        bubble.querySelector(SELECTORS.message_text) || bubble.querySelector('span[dir="ltr"]');
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

if (typeof module !== 'undefined') {
  module.exports = {
    startScrapingLoop,
    scrapeMessages,
    scrapeContactInfo,
    SELECTORS,
  };
}
