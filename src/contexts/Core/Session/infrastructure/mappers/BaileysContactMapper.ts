import type { Contact } from 'baileys';
import type { SessionContactSummary } from '@/contexts/Core/Session/application/SessionProvider';

export const buildContactSummary = (contact: Partial<Contact>): SessionContactSummary | null => {
    const id = contact.id ?? '';
    if (!id) {
        return null;
    }

    return {
        id,
        lid: contact.lid,
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        notify: contact.notify,
        verifiedName: contact.verifiedName,
        imgUrl: contact.imgUrl,
        status: contact.status,
    };
};

export const isContactSummary = (value: SessionContactSummary | null): value is SessionContactSummary => Boolean(value);
