import { ChatMessage } from '../types';
import { Bridge } from './bridge';

// Export as getMessages so it matches the expected interface for now, 
// but enforce the parameter.
export async function getMessages(chatIdLike: string): Promise<ChatMessage[]> {
     console.log(`[Extractor] Fetching Messages for "${chatIdLike}" via Bridge...`);
     const messages = await Bridge.getMessages(chatIdLike, 50);
     return messages || [];
}
