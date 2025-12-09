
export const Bridge = {
    openChat: (chatIdentifier: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', listener);
                console.warn('[Bridge] Open Chat timed out for:', chatIdentifier);
                resolve(false);
            }, 5000);

            const listener = (event: MessageEvent) => {
                if (event.data.type === 'MIDORI_CMD_OPEN_CHAT_RESULT' && 
                    event.data.chatId === chatIdentifier) {
                    
                    clearTimeout(timeout);
                    window.removeEventListener('message', listener);
                    resolve(event.data.success);
                }
            };

            window.addEventListener('message', listener);
            window.postMessage({ type: 'MIDORI_CMD_OPEN_CHAT', chatId: chatIdentifier }, '*');
        });
    }
};
