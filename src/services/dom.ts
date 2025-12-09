export const findMainElement = (): HTMLElement | null => {
  const input = document.querySelector<HTMLElement>('div[role="textbox"]');
  if (input) {
      const findChatPanel = (el: HTMLElement | null, depth: number): HTMLElement | null => {
          if (!el || depth > 15) return null;
          
          const hasHeader = el.querySelector(':scope > header') || el.querySelector('header');
          if (hasHeader) {
               // CRITICAL: Ensure we haven't gone too high and captured the sidebar
               // Sidebar usually has 'Search' or 'Pesquisar' inputs or text near the top
               // But we are in the chat panel. 
               // Heuristic: Chat Panel usually has a MESSAGE LIST sibling.
               const hasMsgList = el.querySelector('div[aria-label="Message list"]');
               const hasSidebarParams = el.innerText.includes('Pesquisar') || el.innerText.includes('Search');
               
               // Ideally, we want the node that Has Header AND Has Message List
               // AND explicitly does NOT look like the sidebar
               if (hasMsgList && !hasSidebarParams) return el;
               
               // If no message list found yet (Aria label might be gone), 
               // but we have a header and NO sidebar text, this is a strong candidate for #main.
               if (hasHeader && !hasSidebarParams) return el;
          }
          return findChatPanel(el.parentElement, depth + 1);
      };
      
      const panel = findChatPanel(input.parentElement, 0);
      if (panel) return panel;
  }

  // Strategy 2: Standard #main (Fallback)
  const mainEl = document.querySelector<HTMLElement>('#main');
  if (mainEl) return mainEl;

  return null;
};
