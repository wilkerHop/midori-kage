import { SELECTORS } from '../config/selectors';
import { $, $$, normalizeText, sleep } from '../utils/common';

export async function waitForHeaderChange(expectedName: string): Promise<boolean> {
  const maxRetries = 10;
  const normalizedExpected = normalizeText(expectedName);

  for (let i = 0; i < maxRetries; i++) {
      let mainEl = document.querySelector<HTMLElement>('#main');

      if (!mainEl) {
          const input = document.querySelector<HTMLElement>('div[role="textbox"]');
          if (input) {
              const potentialMain = input.closest('main') as HTMLElement | null;
              if (potentialMain) {
                  mainEl = potentialMain;
              } else {
                   const wrapper = input.closest('div[data-testid="conversation-panel-wrapper"]') as HTMLElement | null;
                   if (wrapper) mainEl = wrapper;
              }
          }
      }

      if (mainEl) {
          const topText = mainEl.innerText.substring(0, 1000);
          const normalizedText = normalizeText(topText);
          if (normalizedText.includes(normalizedExpected)) return true;
      }

      if (i > 5) {
         const input = document.querySelector<HTMLElement>('div[role="textbox"]');
         if (input && window.getComputedStyle(input).visibility !== 'hidden') {
             if (i === maxRetries - 1) {
                 console.warn(`[Nav] Name mismatch but Chat Input visible. Trusting state.`);
                 return true;
             }
         }
      }
      await sleep(500);
  }
  return false;
}

export function getChatRows(): HTMLElement[] {
  return Array.from($$(SELECTORS.chat_row));
}

export async function scrollChatList(): Promise<boolean> {
   const chatList = $(SELECTORS.chat_list) || document.querySelector<HTMLElement>('#pane-side');
   if (!chatList) return false;

   const previousScrollTop = chatList.scrollTop;
   chatList.scrollTop += 600;
   await sleep(2000); // Network wait
   
   return chatList.scrollTop !== previousScrollTop;
}
