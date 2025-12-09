

const WPP: Window['Midori'] = {
    webpack: undefined, whatsapp: undefined, chat: undefined, cmd: undefined, msg: undefined, contact: undefined,
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
                    const mod = require(id) as { default?: { 
                        openChatAt?: unknown; openChat?: unknown; 
                        Chat?: unknown; Msg?: unknown; Contact?: unknown 
                    } };
                    if (!mod) return;
                    if (mod.default?.openChatAt) WPP.cmd = mod.default;
                    if (mod.default?.Chat) WPP.chat = mod.default.Chat;
                    if (mod.default?.Msg) WPP.msg = mod.default.Msg;
                    if (mod.default?.Contact) WPP.contact = mod.default.Contact;
                } catch { /* ignore */ }
            });
            setupMidoriApi();
        }
    ]);
};

const setupMidoriApi = () => {
    if (WPP.cmd && WPP.chat && WPP.msg && WPP.contact) {
        console.log('[Midori] API Ready. Listening for commands...');
        
        const Cmd = WPP.cmd as { openChatAt?: (m: unknown) => Promise<boolean>; openChat?: (id: string) => Promise<boolean> };
        const ChatStore = WPP.chat as { get: (id: string) => unknown; models: Array<{ id: { _serialized: string }; name?: string; formattedTitle?: string; contact?: { name?: string } }> };
        const MsgStore = WPP.msg as { get: (id: string) => unknown; getByChatId: (id: string) => { all: () => unknown[] } };
        // const ContactStore = WPP.contact as { get: (id: string) => unknown };

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
            const { type, chatId, payload } = event.data;
            
            if (type === 'MIDORI_CMD_OPEN_CHAT') {
                const success = await WPP.openChat(chatId);
                window.postMessage({ type: 'MIDORI_CMD_OPEN_CHAT_RESULT', success, chatId }, '*');
            }

            if (type === 'MIDORI_CMD_GET_MESSAGES') {
                // We need to resolve the Chat ID first because Scraper sends Names
                const foundModel = ChatStore.models.find(m => m.name === chatId || m.formattedTitle === chatId || m.contact?.name === chatId);
                const realId = foundModel ? foundModel.id._serialized : (chatId.includes('@') ? chatId : `${chatId}@c.us`);

                const getRawMessages = (): unknown[] => {
                     const chat = ChatStore.get(realId) as { msgs?: { models: unknown[] } };
                     if (chat?.msgs?.models) return chat.msgs.models;
                     try {
                        const msgs = MsgStore.getByChatId(realId);
                        if(msgs && msgs.all) return msgs.all() as unknown[];
                     } catch { /* ignore */ }
                     return [];
                };

                const messages = getRawMessages();
                const limit = (payload as { limit?: number })?.limit || 50;

                // Serialize explicitly to avoid circular struct issues in postMessage
                // Minimal payload: text, author, timestamp
                const cleanMessages = messages.map((m: unknown) => {
                    const msg = m as { body?: string; text?: string; t?: number; id?: { fromMe?: boolean } };
                    return {
                        text: msg.body || msg.text || '', // Adjust based on actual prop
                        info: msg.t ? new Date(msg.t * 1000).toISOString() : '',
                        fromMe: msg.id?.fromMe
                    };
                }).slice(-limit);

                window.postMessage({ type: 'MIDORI_CMD_GET_MESSAGES_RESULT', messages: cleanMessages, chatId }, '*');
            }
            
            if (type === 'MIDORI_CMD_GET_CONTACT') {
                 // Resolve ID
                const foundModel = ChatStore.models.find(m => m.name === chatId || m.formattedTitle === chatId || m.contact?.name === chatId);
                const contact = foundModel ? { name: foundModel.name || foundModel.formattedTitle, isGroup: foundModel.contact?.name === undefined } : { name: chatId };
                
                window.postMessage({ type: 'MIDORI_CMD_GET_CONTACT_RESULT', contact, chatId }, '*');
            }

        });

        window.postMessage({ type: 'MIDORI_INJECTION_SUCCESS', payload: 'API Ready' }, '*');
    }
};
