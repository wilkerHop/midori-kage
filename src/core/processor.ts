import { SELECTORS } from '../config/selectors';
import { Bridge } from '../services/bridge';
import { getContactInfo, getMessages } from '../services/extractor';
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
             console.log(`[Skipping] Pinned chat detected: "${rawName}"`);
             state.processedChatNames.add(rawName);
             return false;
         }
    }

    // 2. Interaction
    sendStatus(`Opening: ${rawName}`);
    // Replace brittle DOM click and header wait with robust Bridge Open
    const opened = await Bridge.openChat(rawName);
    if (!opened) {
        console.warn(`[Processor] Bridge failed to open chat: "${rawName}"`);
        // Fallback or skip? Assuming skip.
        // We could try click as fallback, but let's trust the Bridge or nothing.
        return false;
    }
    
    await sleep(500); // Small buffer for render/state update

    // 3. Group Check (Post-Click)
    // Note: getContactInfo via Bridge does NOT need the drawer open.
    // But the group skipping logic in processor relies on `state.skipGroups` and DOM checks.
    // Let's rely on `getContactInfo` returning `isGroup`.
    
    // 4. Extraction
    const contactInfo = await getContactInfo(rawName);
    if (state.skipGroups && contactInfo.isGroup) {
        console.log(`[Skipping] Group detected (Bridge): "${rawName}"`);
        state.processedChatNames.add(rawName);
        return false;
    }

    state.processedChatNames.add(rawName);

    // Pass the name to getMessages
    const messages = await getMessages(rawName);

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
