export const serializeMessage = (m: unknown) => {
    const msg = m as { body?: string; text?: string; t?: number; id?: { fromMe?: boolean } };
    return {
        text: msg.body || msg.text || '',
        info: msg.t ? new Date(msg.t * 1000).toISOString() : '',
        fromMe: msg.id?.fromMe
    };
};

export const serializeContact = (model: { name?: string; formattedTitle?: string; contact?: { name?: string } } | undefined, chatId: string) => {
     return model 
        ? { name: model.name || model.formattedTitle, isGroup: model.contact?.name === undefined } 
        : { name: chatId };
};
