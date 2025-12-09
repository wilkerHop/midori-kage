export { };

declare global {
  interface Window {
    Midori: {
      webpack: any;
      whatsapp: any;
      chat: any;
      cmd: any;
      openChat: (chatId: string) => Promise<boolean>;
    };
    MidoriExtractor: {
      getContactInfo: (name: string) => Promise<any>;
      getMessages: () => Promise<any[]>;
    };
    webpackChunkwhatsapp_web_client?: any[];
  }
}
