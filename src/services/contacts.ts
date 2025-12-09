import { SELECTORS } from '../config/selectors';
import { ContactInfo } from '../types';
import { sleep } from '../utils/common';
import { findMainElement } from './dom';

export async function getContactInfo(rawName: string): Promise<ContactInfo> {
    const mainEl = findMainElement();
    const header = mainEl ? mainEl.querySelector<HTMLElement>('header') : document.querySelector<HTMLElement>('header');
    
    if (!header) {
        console.error(`[Extractor] Contact Header NOT found for "${rawName}". MainEl found: ${!!mainEl}`);
        if(mainEl) console.log(`[Extractor] MainEl children: ${mainEl.children.length}`);
        return { name: rawName, about: '', isGroup: false };
    }

    // console.log(`[Extractor] Clicking header for "${rawName}"...`);
    header.click();
    await sleep(2000);

    const drawer = document.querySelector<HTMLElement>('div[role="navigation"]') || document.querySelector<HTMLElement>('section');
    if (!drawer) {
        console.error(`[Extractor] Drawer NOT found for "${rawName}"`);
        console.log('[Extractor] Checking for any open drawers or panels...');
        
        // Debug: Dump body classes or overlay presence
        const overlays = document.querySelectorAll('div[data-animate-modal-popup]');
        if(overlays.length > 0) console.log(`[Extractor] Found ${overlays.length} modal popups.`);
        
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        return { name: rawName, about: '', isGroup: false };
    }
    
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
