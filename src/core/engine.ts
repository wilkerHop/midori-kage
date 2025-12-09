import { ScrapedChat, ScrapingRequest } from '../types';
import { runScrapingLoop } from './loop';
import { LoopState } from './processor';

export function createScraperEngine() {
    // Mutable state container (No reassignment)
    const state = {
        isRunning: false,
        scrapedChats: [] as ScrapedChat[],
        processedChatNames: new Set<string>()
    };

    const stop = () => { state.isRunning = false; };
    const getStatus = () => ({ isRunning: state.isRunning, count: state.scrapedChats.length, chats: state.scrapedChats });
    const checkRunning = () => state.isRunning;

    const sendStatus = (status: string, done = false) => {
        try {
            chrome.runtime.sendMessage({ 
                action: 'status_update', 
                status, 
                count: state.scrapedChats.length, 
                done 
            }, () => { 
                if (chrome.runtime.lastError) { /* Ignore */ } 
            });
        } catch { /* Ignore */ }
    };

    const start = async (request: ScrapingRequest) => {
        if (state.isRunning) return; 
        
        state.isRunning = true;
        state.scrapedChats.length = 0; // Clear array in-place
        state.processedChatNames.clear();

        sendStatus('Starting...', false);

        const loopState: LoopState = {
            limit: request.limit || 50,
            skipPinned: request.skipPinned || false,
            skipGroups: request.skipGroups || false,
            scrapedChats: state.scrapedChats, // Shared reference
            processedChatNames: state.processedChatNames,
            consecutiveNoScroll: 0
        };

        try {
            await runScrapingLoop(
                loopState,
                checkRunning,
                (s) => sendStatus(s, false)
            );
        } catch (e) {
            console.error(e);
            sendStatus('Error occurred', true);
        }

        state.isRunning = false;
        sendStatus('Done', true);
    };

    return { start, stop, getStatus };
}
