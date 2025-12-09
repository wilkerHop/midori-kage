import { WPP, setupMidoriApi } from './midori-api';

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
                } catch (e) { 
                    console.debug('[Midori] Module Scan Error (Expected):', e);
                }
            });
            setupMidoriApi();
        }
    ]);
};
