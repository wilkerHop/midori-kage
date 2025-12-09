import { SELECTORS } from '../config/selectors';
import { ChatMessage } from '../types';
import { sleep } from '../utils/common';
import { findMainElement } from './dom';

const findMessageContainer = (): HTMLElement | null => {
    const mainEl = findMainElement();
    if (mainEl) {
        const container = mainEl.querySelector<HTMLElement>(SELECTORS.message_container);
        if (container) return container;

        const ariaMsg = mainEl.querySelector<HTMLElement>('div[aria-label="Message list"]');
        if (ariaMsg) return ariaMsg;
        
        const children = Array.from(mainEl.children) as HTMLElement[];
        return children.reduce<HTMLElement | null>((tallest, child) => {
             if (child.tagName === 'HEADER' || child.querySelector('div[role="textbox"]')) return tallest;
             if (!tallest) return child;
             return child.clientHeight > tallest.clientHeight ? child : tallest;
        }, null);
    }
    
    return document.querySelector<HTMLElement>(SELECTORS.message_container) || 
           document.querySelector<HTMLElement>('div[aria-label="Message list"]');
};

export async function getMessages(): Promise<ChatMessage[]> {
    await sleep(1500);
    const container = findMessageContainer();

    if (!container) {
        console.error('[Extractor] Message container NOT found.');
        
        // Debug: Dump mainEl children
        const mainEl = findMainElement();
        if(mainEl) {
             console.log(`[Extractor] MainEl Children: ${mainEl.children.length}`);
             Array.from(mainEl.children).forEach(c => console.log(` - Child: ${c.tagName} | Class: ${c.className}`));
        } else {
             console.log('[Extractor] MainEl is NULL during message extraction.');
        }
        
        return [];
    }

    const bubbles = container.querySelectorAll<HTMLElement>(SELECTORS.message_bubble);
    const messageDivs = bubbles.length > 0 ? bubbles : container.querySelectorAll<HTMLElement>('div.message-in, div.message-out');
    const nodes = bubbles.length > 0 ? bubbles : messageDivs;

    return Array.from(nodes).map((bubble) => {
        try {
            const textEl = bubble.querySelector<HTMLElement>(SELECTORS.message_text) || bubble.querySelector<HTMLElement>('span[dir="ltr"]');
            const infoEl = bubble.querySelector<HTMLElement>(SELECTORS.message_info) || bubble.querySelector<HTMLElement>('div[data-pre-plain-text]');
            
            const rawText = textEl ? textEl.innerText : '';
            const info = infoEl ? (infoEl.getAttribute('data-pre-plain-text') || '') : '';
            const text = rawText || (bubble as HTMLElement).innerText;

            if (text || info) return { info: info.trim(), text: text.trim() };
            return null;
        } catch { 
            return null; 
        }
    }).filter((msg): msg is ChatMessage => msg !== null);
}
