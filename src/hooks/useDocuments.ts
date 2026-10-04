import { fileImport } from '@/types';
import { Message } from '@/types';

export async function loadDocs() {
    const response = await fetch(`api/getFiles`);
    const data = await response.json();
    const formattedDocs = data.output.map((file: fileImport) => ({
        id: file.document_id,
        name: file.file_name,
        size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`,
        updatedAt: new Date(file.created_at).toLocaleString('uk-UA'),
        status: file.status
    }))

    return formattedDocs;
}


export async function docClick(docName: string, docId: string, setCurrentBot: (bot: { name: string, id: string }) => void, setMessages: (messages: Message[]) => void, currentBot: {name: string, id: string}) {
    if (currentBot.id != docId) {
        setCurrentBot({ name: docName, id: docId });
        console.log(`${docName} + ${docId}`)
        setMessages([{
            id: 'm1',
            role: 'assistant',
            content: `Вітаю. Я готовий відповідати на питання за вашою базою знань документа '${docName}'.`,
        }])
    }
};
