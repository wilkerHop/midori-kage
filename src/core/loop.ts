import { getChatRows, scrollChatList } from '../services/navigator';
import { LoopState, processRow } from './processor';

// Recursive Batch Processor
const processBatch = async (
    rows: HTMLElement[], 
    index: number, 
    processedInBatch: boolean,
    state: LoopState,
    checkRunning: () => boolean,
    sendStatus: (s: string) => void
): Promise<boolean> => {
    if (!checkRunning() || state.scrapedChats.length >= state.limit) return processedInBatch;
    if (index >= rows.length) return processedInBatch;

    const processed = await processRow(rows[index], state, sendStatus);
    return processBatch(rows, index + 1, processedInBatch || processed, state, checkRunning, sendStatus);
};

// Main Recursive Loop
export async function runScrapingLoop(
    state: LoopState,
    checkRunning: () => boolean, 
    sendStatus: (s: string) => void
): Promise<void> {
    if (!checkRunning() || state.scrapedChats.length >= state.limit) return; // Base case

    const rows = getChatRows();
    const processedAny = await processBatch(rows, 0, false, state, checkRunning, sendStatus);

    if (!processedAny) {
         const moved = await scrollChatList();
         if (moved) state.consecutiveNoScroll = 0;
         else state.consecutiveNoScroll++;

         if (state.consecutiveNoScroll > 3) {
             console.log('End of list reached or scroll stuck.');
             return;
         }
    }

    return runScrapingLoop(state, checkRunning, sendStatus); // Tail recursion
}
