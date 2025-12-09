// Centralized debug logger to save lines in main files

export const logMismatch = (expected: string, topText: string, headerTitle: string, mainEl: HTMLElement) => {
    console.warn(`[Nav] Mismatch Details -> Expected: "${expected}" | TopText: "${topText}" | HeaderTitle: "${headerTitle}"`);
    console.warn(`[Nav] MainEl Classes: ${mainEl.className} | ID: ${mainEl.id}`);
    console.warn(`[Nav] Main Element Dump:`, mainEl.innerHTML.substring(0, 500));
    
    const header = mainEl.querySelector('header');
    if (header) console.warn('[Nav] Header Dump:', header.innerHTML);
};
