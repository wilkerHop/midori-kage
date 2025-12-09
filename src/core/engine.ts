import { ScrapedChat, ScrapingRequest } from '../types';
import { runScrapingLoop } from './loop';

export function createScraperEngine() {
    let isRunning = false;
    let processedChatNames = new Set<string>();
    let scrapedChats: ScrapedChat[] = [];
    let limit = 50;

    const stop = () => { isRunning = false; };
    const getStatus = () => { return { isRunning, count: scrapedChats.length, chats: scrapedChats }; };
    const checkRunning = () => isRunning;

    const sendStatus = (status: string, done = false) => {
        try {
            chrome.runtime.sendMessage({ 
                action: 'status_update', 
                status, 
                count: scrapedChats.length, 
                done 
            }, () => { 
                if (chrome.runtime.lastError) { /* Ignore */ } 
            });
        } catch { /* Ignore */ }
    };

    const start = async (request: ScrapingRequest) => {
        if (isRunning) return; 
        
        isRunning = true;
        limit = request.limit || 50;
        scrapedChats = [];
        processedChatNames = new Set();

        sendStatus('Starting...', false);

        try {
            await runScrapingLoop(
                limit, 
                request.skipPinned || false, 
                request.skipGroups || false,
                scrapedChats,
                processedChatNames,
                checkRunning,
                (s) => sendStatus(s, false)
            );
        } catch (e) {
            console.error(e);
            sendStatus('Error occurred', true);
        }

        isRunning = false;
        sendStatus('Done', true);
    };

    return { start, stop, getStatus };
}
