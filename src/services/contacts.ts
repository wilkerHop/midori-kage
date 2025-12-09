import { ContactInfo } from '../types';
import { Bridge } from './bridge';

export async function getContactInfo(rawName: string): Promise<ContactInfo> {
    console.log(`[Extractor] Fetching Contact Info for "${rawName}" via Bridge...`);
    const contact = await Bridge.getContact(rawName);
    
    if (!contact) {
        console.warn(`[Extractor] Bridge failed to get contact for "${rawName}"`);
        return { name: rawName, about: '', isGroup: false };
    }
    
    return contact;
}
