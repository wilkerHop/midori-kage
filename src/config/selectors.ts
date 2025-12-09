import { Selectors } from '../types';

export const SELECTORS: Selectors = {
  chat_list: '#pane-side',
  chat_row: 'div[role="row"]',
  chat_list_title: 'span[title]',
  header_title_container: '#main header span[title]',
  message_container: 'div[role="application"]',
  message_bubble: 'div[role="row"]',
  message_text: 'span.selectable-text',
  message_info: 'div[data-pre-plain-text]',
  contact_info_name: "section span[dir='auto']",
  contact_info_about: 'span[title]',
  contact_drawer_close_btn: "div[aria-label='Close']",
};
