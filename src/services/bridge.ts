import { ChatMessage, ContactInfo } from '../types';

const sendTokenizedRequest = <T>(type: string, chatId: string, payload?: unknown): Promise<T> => {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            window.removeEventListener('message', listener);
            console.warn(`[Bridge] ${type} timed out for:`, chatId);
            resolve(undefined as T);
        }, 8000);

        const listener = (event: MessageEvent) => {
            if (event.data.type === `${type}_RESULT` && event.data.chatId === chatId) {
                clearTimeout(timeout);
                window.removeEventListener('message', listener);
                 // Determine what to return based on result type keys
                if (event.data.messages) resolve(event.data.messages as T);
                else if (event.data.contact) resolve(event.data.contact as T);
                else resolve(event.data.success as T);
            }
        };

        window.addEventListener('message', listener);
        window.postMessage({ type, chatId, payload }, '*');
    });
};

export const Bridge = {
    openChat: (chatId: string) => sendTokenizedRequest<boolean>('MIDORI_CMD_OPEN_CHAT', chatId),
    getMessages: (chatId: string, limit: number) => sendTokenizedRequest<ChatMessage[]>('MIDORI_CMD_GET_MESSAGES', chatId, { limit }),
    getContact: (chatId: string) => sendTokenizedRequest<ContactInfo>('MIDORI_CMD_GET_CONTACT', chatId)
};
