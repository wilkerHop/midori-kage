

const WPP: Window['Midori'] = {
    webpack: undefined, whatsapp: undefined, chat: undefined, cmd: undefined,
    openChat: undefined as unknown as (chatId: string) => Promise<boolean>
};

window.Midori = WPP;

export const startModuleScan = () => {
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

const findModules = (chunk: unknown[]) => {
    console.log('[Midori] Scanning modules...');
    chunk.push([
        ['midori-injector'], {}, 
        (require: { m: Record<string, unknown>; (id: string): unknown }) => {
            const modules = require.m;
            Object.keys(modules).forEach((id) => {
                try {
                    const mod = require(id) as { default?: { openChatAt?: unknown; openChat?: unknown; Chat?: unknown } };
                    if (!mod) return;
                    if (mod.default?.openChatAt) WPP.cmd = mod.default;
                    if (mod.default?.Chat) WPP.chat = mod.default.Chat;
                } catch { /* ignore */ }
            });
            setupMidoriApi();
        }
    ]);
};

const setupMidoriApi = () => {
    if (WPP.cmd && WPP.chat) {
        console.log('[Midori] API Ready. Listening for commands...');
        
        const Cmd = WPP.cmd as { openChatAt?: (m: unknown) => Promise<boolean>; openChat?: (id: string) => Promise<boolean> };
        const ChatStore = WPP.chat as { get: (id: string) => unknown; models: Array<{ id: { _serialized: string }; name?: string; formattedTitle?: string; contact?: { name?: string } }> };

        WPP.openChat = async (chatIdOrName: string) => {
            const initialWid = chatIdOrName.includes('@') ? chatIdOrName : `${chatIdOrName}@c.us`;
            const initialChatModel = ChatStore.get(initialWid);
            
            const foundModel = !initialChatModel 
                ? ChatStore.models.find(m => m.name === chatIdOrName || m.formattedTitle === chatIdOrName || m.contact?.name === chatIdOrName)
                : undefined;

             if (foundModel) console.log(`[Midori] Resolved "${chatIdOrName}" to ${foundModel.id._serialized}`);

            const finalChatModel = foundModel || initialChatModel;
            const finalWid = foundModel ? foundModel.id._serialized : initialWid;
            
            if (Cmd.openChatAt && finalChatModel) {
                 await Cmd.openChatAt(finalChatModel);
                 return true;
            } else if (Cmd.openChat) {
                await Cmd.openChat(finalWid);
                return true;
            }
            return false;
        };
        
        window.addEventListener('message', async (event) => {
            if (event.data.type === 'MIDORI_CMD_OPEN_CHAT') {
                const { chatId } = event.data;
                const success = await WPP.openChat(chatId);
                window.postMessage({ type: 'MIDORI_CMD_OPEN_CHAT_RESULT', success, chatId }, '*');
            }
        });

        window.postMessage({ type: 'MIDORI_INJECTION_SUCCESS', payload: 'API Ready' }, '*');
    } else {
        console.warn('[Midori] Cmd module not found in scan.');
    }
};
