import { SELECTORS } from '../config/selectors';
import { getContactInfo, getMessages } from '../services/extractor';
import { waitForHeaderChange } from '../services/navigator';
import { ScrapedChat } from '../types';
import { sleep } from '../utils/common';

export interface LoopState {
    limit: number;
    skipPinned: boolean;
    skipGroups: boolean;
    scrapedChats: ScrapedChat[];
    processedChatNames: Set<string>;
    consecutiveNoScroll: number;
}

export const processRow = async (
    row: HTMLElement, 
    state: LoopState, 
    sendStatus: (s: string) => void
): Promise<boolean> => {
    // 1. Validation & Filtering
    const titleEl = row.querySelector<HTMLElement>(SELECTORS.chat_list_title);
    if (!titleEl) return false;

    const rawName = titleEl.innerText.trim();
    if (state.processedChatNames.has(rawName)) return false;

    if (state.skipPinned) {
         const pinned = row.querySelector('span[data-icon="pinned"]') || 
                        row.querySelector('span[data-icon="pin"]') ||
                        row.innerHTML.includes('aria-label="pinned"');
         if (pinned) {
             state.processedChatNames.add(rawName);
             return false;
         }
    }

    // 2. Interaction
    sendStatus(`Opening: ${rawName}`);
    const opts = { bubbles: true, cancelable: true, view: window };
    row.dispatchEvent(new MouseEvent('mousedown', opts));
    row.dispatchEvent(new MouseEvent('mouseup', opts));
    row.click();

    const verified = await waitForHeaderChange(rawName);
    if (!verified) console.warn(`Header verification failed: ${rawName}`);

    // 3. Group Check (Post-Click)
    if (state.skipGroups) {
        const groupHeader = document.querySelector('span[title="Click here for group info"]');
        if (groupHeader) { 
            state.processedChatNames.add(rawName); 
            return false; 
        }
    }

    state.processedChatNames.add(rawName);

    // 4. Extraction
    const contactInfo = await getContactInfo(rawName);
    if (state.skipGroups && contactInfo.isGroup) return false;

    const messages = await getMessages();

    state.scrapedChats.push({
        chat_name: rawName,
        safe_name: rawName.replace(/[^a-z0-9]/gi, ''),
        contact_info: contactInfo,
        messages
    });

    sendStatus(`Scraped: ${rawName}`);
    await sleep(1000 + Math.random() * 1000);
    return true;
};
