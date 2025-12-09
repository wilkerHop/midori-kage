import { SELECTORS } from '../config/selectors';
import { $, $$, normalizeText, sleep } from '../utils/common';
import { logMismatch } from '../utils/logger';
import { Bridge } from './bridge';

export async function selectChat(row: HTMLElement): Promise<boolean> {
   if (!row) return false;
   
   // Try to get identifier from Title attribute or Text
   const titleSpan = row.querySelector<HTMLElement>(SELECTORS.chat_row + ' span[title]');
   const identifier = titleSpan ? titleSpan.getAttribute('title') : (row.innerText.split('\n')[0] || '');
   
   if (!identifier) {
       console.warn('[Nav] Could not identify chat row.');
       return false;
   }
   
   console.log(`[Nav] Attempting to open chat "${identifier}" via Bridge...`);
   const success = await Bridge.openChat(identifier);
   
   if (success) {
       console.log(`[Nav] Bridge Success for "${identifier}"`);
       await sleep(500); // Give UI a moment
       return true;
   }

   console.warn(`[Nav] Bridge failed for "${identifier}". Falling back to click.`);
   row.click();
   await sleep(1000); // Wait for click
   return true; // Assume click worked for now, validation happens later
}

import { findMainElement } from './dom';

export { findMainElement }; // Re-export if needed, or just let consumers import from dom

const checkHeader = async (expected: string, attempt: number, maxRetries: number): Promise<boolean> => {
  if (attempt >= maxRetries) return false;

  const mainEl = findMainElement();
  if (mainEl) {
    const headerTitle = mainEl.querySelector('header h2 span') as HTMLElement || mainEl.querySelector('header span[title]') as HTMLElement;
    const topText = headerTitle ? headerTitle.innerText : mainEl.innerText.substring(0, 1000);
    
    
    if (attempt === maxRetries - 1 && !normalizeText(topText).includes(expected)) {
         logMismatch(expected, normalizeText(topText), headerTitle ? headerTitle.innerText : 'N/A', mainEl);
    }

    if (normalizeText(topText).includes(expected)) return true;
  } else {
      console.warn(`[Nav] checkHeader: findMainElement() returned NULL`);
  }

  // Graceful fallback for visible input
  if (attempt > 5) {
      const input = document.querySelector<HTMLElement>('div[role="textbox"]');
      if (input && window.getComputedStyle(input).visibility !== 'hidden') {
          if (attempt === maxRetries - 1) {
              console.warn(`[Nav] Name mismatch. Expected: "${expected}". Found in Header: "${normalizeText(mainEl?.innerText || '')}". Chat Input visible. Trusting state.`);
              return true;
          }
      }
  }

  await sleep(500);
  return checkHeader(expected, attempt + 1, maxRetries);
};

export async function waitForHeaderChange(expectedName: string): Promise<boolean> {
  return checkHeader(normalizeText(expectedName), 0, 10);
}

export function getChatRows(): HTMLElement[] {
  return Array.from($$(SELECTORS.chat_row));
}

export async function scrollChatList(): Promise<boolean> {
   const chatList = $(SELECTORS.chat_list) || document.querySelector<HTMLElement>('#pane-side');
   if (!chatList) return false;

   const previousScrollTop = chatList.scrollTop;
   chatList.scrollTop += 600;
   await sleep(2000);
   
   return chatList.scrollTop !== previousScrollTop;
}
