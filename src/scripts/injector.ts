/* eslint-disable @typescript-eslint/no-explicit-any */
export interface WebpackModule {
    id: string;
    exports: any;
}

// Global WPP Object to expose functionalities
const WPP = {
    webpack: undefined as any,
    whatsapp: undefined as any,
    chat: undefined as any,
    cmd: undefined as any,
    openChat: undefined as unknown as (chatId: string) => Promise<boolean>
};

(window as any).Midori = WPP;

const inject = () => {
    console.log('[Midori] Injector starting...');

    const checkLoad = setInterval(() => {
        // Attempt to find the specific webpack chunk for WhatsApp Web
        const chunkName = 'webpackChunkwhatsapp_web_client';
        const chunk = (window as any)[chunkName];

        if (chunk) {
            clearInterval(checkLoad);
            console.log('[Midori] Webpack chunk found!');
            findModules(chunk);
        }
    }, 1000);
};

const findModules = (chunk: any) => {
    console.log('[Midori] Scanning modules...');
    
    // Webpack 5 chunk structure: [ [id], { [moduleId]: fn }, ... ]
    
    // We push a new chunk that requests all modules.
    chunk.push([
        ['midori-injector'], 
        {}, 
        (require: any) => {
            const modules = require.m; // All modules
            
            // Loop through all modules to find 'Cmd' and 'Chat'
            Object.keys(modules).forEach((id) => {
                try {
                    const mod = require(id);
                    if (!mod) return;
                    
                    // signatures
                    if (mod.default && mod.default.openChatAt) {
                         console.log('[Midori] Found Cmd Module:', id);
                         WPP.cmd = mod.default;
                    }
                    if (mod.default && mod.default.Chat) {
                         console.log('[Midori] Found Chat Store:', id);
                         WPP.chat = mod.default.Chat;
                    }
                } catch {
                    // ignore
                }
            });
            
            setupMidoriApi();
        }
    ]);
};

const setupMidoriApi = () => {
    if (WPP.cmd) {
        console.log('[Midori] API Ready. Try window.Midori.openChat("ID")');
        
        WPP.openChat = async (chatId: string) => {
            // Ensure ID format
            const wid = chatId.includes('@') ? chatId : `${chatId}@c.us`;
            
            // We usually need the Chat Model, not just ID
            const chatModel = WPP.chat ? WPP.chat.get(wid) : null;
            
            if (WPP.cmd.openChatAt) {
                 console.log(`[Midori] Opening ${wid} via openChatAt...`);
                 
                 // If we have the model, use it. If not, try ID (though At usually wants model)
                 if (chatModel) {
                     await WPP.cmd.openChatAt(chatModel);
                     return true;
                 } else {
                     console.warn('[Midori] Chat model not found in Store.Chat');
                     // Try openChatFromUnread or similar if available, or just fallback
                 }
            } else if (WPP.cmd.openChat) {
                // older versions
                await WPP.cmd.openChat(wid);
                return true;
            }
            return false;
        };
        
        // Notify Content Script
        window.postMessage({ type: 'MIDORI_INJECTION_SUCCESS', payload: 'API Ready' }, '*');
    } else {
        console.warn('[Midori] Cmd module not found in scan.');
    }
};

inject();
