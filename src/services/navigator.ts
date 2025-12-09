import { SELECTORS } from '../config/selectors';
import { $, $$, normalizeText, sleep } from '../utils/common';
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

export const findMainElement = (): HTMLElement | null => {
  const input = document.querySelector<HTMLElement>('div[role="textbox"]');
  if (input) {
      const findChatPanel = (el: HTMLElement | null, depth: number): HTMLElement | null => {
          if (!el || depth > 15) return null;
          
          const hasHeader = el.querySelector(':scope > header') || el.querySelector('header');
          if (hasHeader) {
               // CRITICAL: Ensure we haven't gone too high and captured the sidebar
               // Sidebar usually has 'Search' or 'Pesquisar' inputs or text near the top
               // But we are in the chat panel. 
               // Heuristic: Chat Panel usually has a MESSAGE LIST sibling.
               const hasMsgList = el.querySelector('div[aria-label="Message list"]');
               const hasSidebarParams = el.innerText.includes('Pesquisar') || el.innerText.includes('Search');
               
               // Ideally, we want the node that Has Header AND Has Message List
               // AND explicitly does NOT look like the sidebar
               if (hasMsgList && !hasSidebarParams) return el;
               
               // If no message list found yet (Aria label might be gone), 
               // but we have a header and NO sidebar text, this is a strong candidate for #main.
               if (hasHeader && !hasSidebarParams) return el;
          }
          return findChatPanel(el.parentElement, depth + 1);
      };
      
      const panel = findChatPanel(input.parentElement, 0);
      if (panel) return panel;
  }

  // Strategy 2: Standard #main (Fallback)
  const mainEl = document.querySelector<HTMLElement>('#main');
  if (mainEl) return mainEl;

  return null;
};

const checkHeader = async (expected: string, attempt: number, maxRetries: number): Promise<boolean> => {
  if (attempt >= maxRetries) return false;

  const mainEl = findMainElement();
  if (mainEl) {
    // Try structural path (Header -> H2 -> Span) or Title attribute
    const headerTitle = mainEl.querySelector('header h2 span') as HTMLElement || mainEl.querySelector('header span[title]') as HTMLElement;
    const topText = headerTitle ? headerTitle.innerText : mainEl.innerText.substring(0, 1000); // Fallback to full text
    
    // Log the specific text we are checking against
    if (attempt === maxRetries - 1 && !normalizeText(topText).includes(expected)) {
         console.warn(`[Nav] Mismatch Details -> Expected: "${expected}" | TopText: "${normalizeText(topText)}" | HeaderTitle: "${headerTitle ? headerTitle.innerText : 'N/A'}"`);
         // DUMP THE DOM to find out what is actually there!
         if (mainEl) console.warn(`[Nav] Main Element Dump:`, mainEl.innerHTML.substring(0, 500));
         if (headerTitle) console.warn(`[Nav] Header Title Dump:`, headerTitle.outerHTML);
    }

    if (normalizeText(topText).includes(expected)) return true;
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
