import { SELECTORS } from '../config/selectors';
import { ChatMessage, ContactInfo } from '../types';
import { $, sleep } from '../utils/common';

export async function getContactInfo(rawName: string): Promise<ContactInfo> {
    const header = $(SELECTORS.header_title_container) || $('#main header');
    if (!header) {
        console.error(`[Extractor] Contact Header NOT found for "${rawName}"`);
        return { name: rawName, about: '', isGroup: false };
    }

    console.log(`[Extractor] Clicking header for "${rawName}"...`);
    header.click();
    await sleep(2000);

    const drawer = document.querySelector<HTMLElement>('div[role="navigation"]') || document.querySelector<HTMLElement>('section');
    if (!drawer) {
        console.error(`[Extractor] Drawer NOT found after click for "${rawName}"`);
        // Close drawer attempt just in case
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        return { name: rawName, about: '', isGroup: false };
    }
    
    // Log drawer content for debugging
    console.log(`[Extractor] Drawer Text (Preview): ${drawer.innerText.substring(0, 100)}...`);

    const isGroup = drawer.innerText.includes('Group info') || drawer.innerText.includes('Dados do grupo');
    const nameEl = drawer.querySelector<HTMLElement>(SELECTORS.contact_info_name) || drawer.querySelector<HTMLElement>('h2');
    const name = nameEl ? nameEl.innerText : rawName;

    const spans = Array.from(drawer.querySelectorAll<HTMLElement>('span'));
    const phoneRegex = /\+?\d[\d\s-]{8,}/;
    const phoneSpan = spans.find((s) => phoneRegex.test(s.innerText) && s.innerText.length < 30);
    
    const aboutEl = drawer.querySelector<HTMLElement>(SELECTORS.contact_info_about);
    const about = phoneSpan ? phoneSpan.innerText : (aboutEl ? aboutEl.innerText : '');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await sleep(500);

    return { name, about, isGroup };
}

const findMessageContainer = (): HTMLElement | null => {
    const container = document.querySelector<HTMLElement>(SELECTORS.message_container);
    if (container) return container;

    const input = document.querySelector<HTMLElement>('div[role="textbox"]');
    if (!input) return null;

    const footer = input.closest('footer');
    if (!footer || !footer.parentElement) return null;

    const children = Array.from(footer.parentElement.children) as HTMLElement[];
    
    // Functional reduce to find tallest sibling
    return children.reduce<HTMLElement | null>((tallest, child) => {
        if (child === footer || child.tagName === 'HEADER') return tallest;
        if (!tallest) return child;
        return child.clientHeight > tallest.clientHeight ? child : tallest;
    }, null);
};

export async function getMessages(): Promise<ChatMessage[]> {
    await sleep(1500);
    const container = findMessageContainer();

    if (!container) {
        console.error('[Extractor] Message container NOT found.');
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
