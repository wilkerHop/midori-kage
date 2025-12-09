import { SELECTORS } from '../config/selectors';
import { $, $$, normalizeText, sleep } from '../utils/common';

export const findMainElement = (): HTMLElement | null => {
  // Strategy 1: Anchor on the Visible Input (Proven to work)
  const input = document.querySelector<HTMLElement>('div[role="textbox"]');
  if (input) {
      const findParentWithHeader = (el: HTMLElement | null, depth: number): HTMLElement | null => {
          if (!el || depth > 10) return null;
          if (el.querySelector(':scope > header') || el.querySelector('header')) return el;
          return findParentWithHeader(el.parentElement, depth + 1);
      };
      
      const distinctParent = findParentWithHeader(input.parentElement, 0);
      if (distinctParent) return distinctParent;
  }

  // Strategy 2: Standard #main (Fallback)
  const mainEl = document.querySelector<HTMLElement>('#main');
  if (mainEl && mainEl.innerText.trim()) return mainEl;

  return null;
};

const checkHeader = async (expected: string, attempt: number, maxRetries: number): Promise<boolean> => {
  if (attempt >= maxRetries) return false;

  const mainEl = findMainElement();
  if (mainEl) {
    const headerTitle = mainEl.querySelector('header span[title]') as HTMLElement;
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
