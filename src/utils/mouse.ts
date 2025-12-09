import { sleep } from './common';

export const Mouse = {
    simulateClick: async (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top + (rect.height / 2);

        const eventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x, // Approximate
            screenY: y  // Approximate
        };

        element.dispatchEvent(new MouseEvent('mousemove', eventOptions));
        await sleep(50 + Math.random() * 50);
        
        element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        await sleep(50 + Math.random() * 50);
        
        element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        element.dispatchEvent(new MouseEvent('click', eventOptions));
    },

    simulateHover: async (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const eventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: rect.left + (rect.width / 2),
            clientY: rect.top + (rect.height / 2)
        };
        element.dispatchEvent(new MouseEvent('mousemove', eventOptions));
        element.dispatchEvent(new MouseEvent('mouseenter', eventOptions));
        element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
    }
};
