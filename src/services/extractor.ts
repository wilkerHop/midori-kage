import { SELECTORS } from '../config/selectors';
import { ChatMessage, ContactInfo } from '../types';
import { $, sleep } from '../utils/common';

export async function getContactInfo(rawName: string): Promise<ContactInfo> {
    const info: ContactInfo = { name: rawName, about: '', isGroup: false };

    const header = $(SELECTORS.header_title_container) || $('#main header');
    if (header) {
        header.click();
    } else {
        return info; // Fail gracefully
    }

    await sleep(2000);

    const drawer = document.querySelector<HTMLElement>('div[role="navigation"]') || document.querySelector<HTMLElement>('section');

    if (drawer) {
        if (drawer.innerText.includes('Group info') || drawer.innerText.includes('Dados do grupo')) {
            info.isGroup = true;
        }

        const nameEl = drawer.querySelector<HTMLElement>(SELECTORS.contact_info_name) || drawer.querySelector<HTMLElement>('h2');
        if (nameEl) info.name = nameEl.innerText;

        const spans = Array.from(drawer.querySelectorAll<HTMLElement>('span'));
        const phoneRegex = /\+?\d[\d\s-]{8,}/;
        const phoneSpan = spans.find((s) => phoneRegex.test(s.innerText) && s.innerText.length < 30);
        
        if (phoneSpan) {
            info.about = phoneSpan.innerText;
        } else {
            const aboutEl = drawer.querySelector<HTMLElement>(SELECTORS.contact_info_about);
            if (aboutEl) info.about = aboutEl.innerText;
        }
    }

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    await sleep(500);

    return info;
}

export async function getMessages(): Promise<ChatMessage[]> {
    await sleep(1500);

    let container = document.querySelector<HTMLElement>(SELECTORS.message_container);
    
    // Strategy: Tallest Sibling of Footer
    if (!container) {
        const input = document.querySelector<HTMLElement>('div[role="textbox"]');
        if (input) {
            const footer = input.closest('footer');
            if (footer && footer.parentElement) {
                const children = Array.from(footer.parentElement.children) as HTMLElement[];
                let maxH = 0;
                let candidate: HTMLElement | null = null;
                for (const child of children) {
                    if (child === footer || child.tagName === 'HEADER') continue;
                    const h = child.clientHeight;
                    if (h > maxH) { maxH = h; candidate = child; }
                }
                if (candidate) container = candidate;
            }
        }
    }

    if (!container) return [];

    const bubbles = container.querySelectorAll<HTMLElement>(SELECTORS.message_bubble);
    const messageDivs = bubbles.length > 0 ? bubbles : container.querySelectorAll<HTMLElement>('div.message-in, div.message-out');
    const messages: ChatMessage[] = [];

    (bubbles.length > 0 ? bubbles : messageDivs).forEach((bubble) => {
        try {
            const textEl = bubble.querySelector<HTMLElement>(SELECTORS.message_text) || bubble.querySelector<HTMLElement>('span[dir="ltr"]');
            const infoEl = bubble.querySelector<HTMLElement>(SELECTORS.message_info) || bubble.querySelector<HTMLElement>('div[data-pre-plain-text]');
            
            let text = textEl ? textEl.innerText : '';
            const info = infoEl ? infoEl.getAttribute('data-pre-plain-text') || '' : '';
            text = text || (bubble as HTMLElement).innerText;

            if (text || info) messages.push({ info: info.trim(), text: text.trim() });
        } catch { /* skip */ }
    });
    return messages;
}
