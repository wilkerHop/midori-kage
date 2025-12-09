// DEBUG: Deep Trace for Element Discovery
export const findMainElement = (): HTMLElement | null => {
  const input = document.querySelector<HTMLElement>('div[role="textbox"]');
  if (input) {
      // console.log('[DOM] Input found (Anchor). Starting upward traversal...');
      
      const findChatPanel = (el: HTMLElement | null, depth: number): HTMLElement | null => {
          if (!el) {
              // console.warn('[DOM] Reached root (null parent).');
              return null;
          }
          if (depth > 15) {
              // console.warn('[DOM] Depth limit reached (15).');
              return null;
          }
          
          const hasHeader = el.querySelector(':scope > header') || el.querySelector('header');
          const hasMsgList = el.querySelector('div[aria-label="Message list"]');
          const hasSidebarParams = el.innerText.includes('Pesquisar') || el.innerText.includes('Search');
          
          // Debug Trace for EVERY level
          // console.log(`[DOM] Depth ${depth}: <${el.tagName} class="${el.className}">. Header: ${!!hasHeader}, MsgList: ${!!hasMsgList}, SidebarTxt: ${hasSidebarParams}`);

          if (hasHeader) {
               if (hasMsgList && !hasSidebarParams) return el;
               if (hasHeader && !hasSidebarParams) return el;
          }
          return findChatPanel(el.parentElement, depth + 1);
      };
      
      const panel = findChatPanel(input.parentElement, 0);
      if (panel) return panel;
  } else {
      console.warn('[DOM] Anchor Input (role=textbox) NOT found.');
  }

  // Strategy 2: Standard #main (Fallback)
  const mainEl = document.querySelector<HTMLElement>('#main');
  if (mainEl) return mainEl;
  
  // Strategy 3: App Wrapper Heuristic? 
  // Often there is a generic .app-wrapper-web
  // but #main is usually consistent.
  
  if(!mainEl) console.warn('[DOM] Fallback #main also NOT found.');

  return null;
};
