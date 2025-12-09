export interface WebpackModule {
    id: string;
    exports: unknown;
}

// Ensure global types are picked up
/// <reference path="../types/global.d.ts" />

const WPP = {
    webpack: undefined,
    whatsapp: undefined,
    chat: undefined,
    cmd: undefined,
    openChat: undefined as unknown as (chatId: string) => Promise<boolean>
};

window.Midori = WPP;

const inject = () => {
    console.log('[Midori] Injector starting...');

    const checkLoad = setInterval(() => {
        const chunkName = 'webpackChunkwhatsapp_web_client';
        const chunk = window[chunkName];

        if (Array.isArray(chunk)) {
            clearInterval(checkLoad);
            console.log('[Midori] Webpack chunk found!');
            findModules(chunk);
        }
    }, 1000);
};

const findModules = (chunk: any[]) => {
    console.log('[Midori] Scanning modules...');
    
    chunk.push([
        ['midori-injector'], 
        {}, 
        (require: any) => {
            const modules = require.m; // All modules
            
            Object.keys(modules).forEach((id) => {
                try {
                    const mod = require(id);
                    if (!mod) return;
                    
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
    if (WPP.cmd && WPP.chat) {
        console.log('[Midori] API Ready. Try window.Midori.openChat("ID")');
        
        // Define robust types for internal modules
        const Cmd = WPP.cmd as { openChatAt?: (m: unknown) => Promise<boolean>; openChat?: (id: string) => Promise<boolean> };
        const ChatStore = WPP.chat as { get: (id: string) => unknown };

        WPP.openChat = async (chatId: string) => {
            const wid = chatId.includes('@') ? chatId : `${chatId}@c.us`;
            const chatModel = ChatStore.get(wid);
            
            if (Cmd.openChatAt) {
                 console.log(`[Midori] Opening ${wid} via openChatAt...`);
                 if (chatModel) {
                     await Cmd.openChatAt(chatModel);
                     return true;
                 }
            } else if (Cmd.openChat) {
                await Cmd.openChat(wid);
                return true;
            }
            return false;
        };
        
        window.postMessage({ type: 'MIDORI_INJECTION_SUCCESS', payload: 'API Ready' }, '*');
    } else {
        console.warn('[Midori] Cmd module not found in scan.');
    }
};

inject();
