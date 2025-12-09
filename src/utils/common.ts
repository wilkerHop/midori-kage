export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const $ = (selector: string): HTMLElement | null => document.querySelector(selector);

export const $$ = (selector: string): NodeListOf<HTMLElement> => document.querySelectorAll(selector);

export const normalizeText = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
