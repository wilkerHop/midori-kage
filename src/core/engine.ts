import { SELECTORS } from '../config/selectors';
import { getContactInfo, getMessages } from '../services/extractor';
import { getChatRows, scrollChatList, waitForHeaderChange } from '../services/navigator';
import { ScrapedChat, ScrapingRequest } from '../types';
import { sleep } from '../utils/common';

export function createScraperEngine() {
    let isRunning = false;
    let processedChatNames = new Set<string>();
    let scrapedChats: ScrapedChat[] = [];
    let limit = 50;

    const stop = () => {
        isRunning = false;
    };

    const getStatus = () => {
        return { isRunning, count: scrapedChats.length, chats: scrapedChats };
    };

    const sendStatus = (status: string, done = false) => {
        try {
            chrome.runtime.sendMessage({ 
                action: 'status_update', 
                status, 
                count: scrapedChats.length, 
                done 
            }, () => { 
                if (chrome.runtime.lastError) {
                    // Ignore
                } 
            });
        } catch {
            // Ignore
        }
    };

    const start = async (request: ScrapingRequest) => {
        if (isRunning) return; 
        
        isRunning = true;
        limit = request.limit || 50;
        scrapedChats = [];
        processedChatNames = new Set();
        const skipPinned = request.skipPinned || false;
        const skipGroups = request.skipGroups || false;

        sendStatus('Starting...', false);

        try {
            let consecutiveNoScroll = 0;

            while (isRunning && scrapedChats.length < limit) {
                const rows = getChatRows();
                let processedAnyInView = false;

                for (const row of rows) {
                    if (!isRunning || scrapedChats.length >= limit) break;

                    const titleEl = row.querySelector<HTMLElement>(SELECTORS.chat_list_title);
                    if (!titleEl) continue;

                    const rawName = titleEl.innerText.trim();
                    if (processedChatNames.has(rawName)) continue;

                    // Filter: Pinned
                    if (skipPinned) {
                         const pinned = row.querySelector('span[data-icon="pinned"]') || 
                                        row.querySelector('span[data-icon="pin"]') ||
                                        row.innerHTML.includes('aria-label="pinned"');
                         if (pinned) {
                             processedChatNames.add(rawName);
                             continue;
                         }
                    }

                    sendStatus(`Opening: ${rawName}`);
                    
                    // Click
                    const opts = { bubbles: true, cancelable: true, view: window };
                    row.dispatchEvent(new MouseEvent('mousedown', opts));
                    row.dispatchEvent(new MouseEvent('mouseup', opts));
                    row.click();

                    const verified = await waitForHeaderChange(rawName);
                    if (!verified) console.warn(`Header verification failed: ${rawName}`);

                    // Filter: Groups (Header/Drawer)
                    if (skipGroups) {
                        const groupHeader = document.querySelector('span[title="Click here for group info"]');
                        if (groupHeader) {
                             processedChatNames.add(rawName);
                             continue;
                        }
                    }

                    processedChatNames.add(rawName);
                    processedAnyInView = true;

                    // Extract
                    const contactInfo = await getContactInfo(rawName);
                    if (skipGroups && contactInfo.isGroup) continue;

                    const messages = await getMessages();

                    scrapedChats.push({
                        chat_name: rawName,
                        safe_name: rawName.replace(/[^a-z0-9]/gi, ''),
                        contact_info: contactInfo,
                        messages
                    });

                    sendStatus(`Scraped: ${rawName}`);
                    await sleep(1000 + Math.random() * 1000);
                }

                if (!processedAnyInView && isRunning) {
                     const moved = await scrollChatList();
                     if (moved) consecutiveNoScroll = 0;
                     else consecutiveNoScroll++;

                     if (consecutiveNoScroll > 3) {
                         console.log('End of list reached or scroll stuck.');
                         break;
                     }
                }
            }
        } catch (e) {
            console.error(e);
            sendStatus('Error occurred', true);
        }

        isRunning = false;
        sendStatus('Done', true);
    };

    return { start, stop, getStatus };
}
