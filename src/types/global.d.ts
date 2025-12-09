export { };

declare global {
  interface Window {
    Midori: {
      webpack: unknown;
      whatsapp: unknown;
      chat: unknown;
      cmd: unknown;
      msg: unknown;
      contact: unknown;
      openChat: (chatId: string) => Promise<boolean>;
    };
    MidoriExtractor: {
      getContactInfo: (name: string) => Promise<unknown>;
      getMessages: () => Promise<unknown[]>;
    };
    webpackChunkwhatsapp_web_client?: unknown[];
  }
}
