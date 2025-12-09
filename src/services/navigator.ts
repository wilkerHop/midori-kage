import { SELECTORS } from '../config/selectors';
import { $, $$, normalizeText, sleep } from '../utils/common';

const findMainElement = (): HTMLElement | null => {
  const mainEl = document.querySelector<HTMLElement>('#main');
  if (mainEl) return mainEl;

  const input = document.querySelector<HTMLElement>('div[role="textbox"]');
  if (!input) return null;

  const potentialMain = input.closest('main') as HTMLElement | null;
  if (potentialMain) return potentialMain;

  return input.closest('div[data-testid="conversation-panel-wrapper"]') as HTMLElement | null;
};

const checkHeader = async (expected: string, attempt: number, maxRetries: number): Promise<boolean> => {
  if (attempt >= maxRetries) return false;

  const mainEl = findMainElement();
  if (mainEl) {
    const topText = mainEl.innerText.substring(0, 1000);
    if (normalizeText(topText).includes(expected)) return true;
  }

  // Graceful fallback for visible input
  if (attempt > 5) {
      const input = document.querySelector<HTMLElement>('div[role="textbox"]');
      if (input && window.getComputedStyle(input).visibility !== 'hidden') {
          if (attempt === maxRetries - 1) {
              console.warn(`[Nav] Name mismatch but Chat Input visible. Trusting state.`);
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
