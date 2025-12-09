export { };

declare global {
  interface Window {
    Midori: {
      webpack: unknown;
      whatsapp: unknown;
      chat: unknown;
      cmd: unknown;
      openChat: (chatId: string) => Promise<boolean>;
    };
    MidoriExtractor: {
      getContactInfo: (name: string) => Promise<unknown>;
      getMessages: () => Promise<unknown[]>;
    };
    webpackChunkwhatsapp_web_client?: unknown[];
  }
}
