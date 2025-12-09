export interface ScrapingRequest {
  action: 'start_scraping' | 'stop_scraping' | 'download_data';
  limit?: number;
  skipPinned?: boolean;
  skipGroups?: boolean;
}

export interface ContactInfo {
  name: string;
  about: string;
  isGroup: boolean;
}

export interface ChatMessage {
  info: string;
  text: string;
}

export interface ScrapedChat {
  chat_name: string;
  safe_name: string;
  contact_info: ContactInfo;
  messages: ChatMessage[];
}

export interface Selectors {
  chat_list: string;
  chat_row: string;
  chat_list_title: string;
  header_title_container: string;
  message_container: string;
  message_bubble: string;
  message_text: string;
  message_info: string;
  contact_info_name: string;
  contact_info_about: string;
  contact_drawer_close_btn: string;
}
