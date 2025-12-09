export * from './contacts';
export * from './messages';

// Debug helper logic
import { getContactInfo } from './contacts';
import { getMessages } from './messages';

window.MidoriExtractor = { getContactInfo, getMessages };
