import { Message } from '@/types';
import { Dispatch, SetStateAction } from 'react';

export async function sendMessage(inputMessage: string, currentBot: {name: string, id: string}, setMessages: Dispatch<SetStateAction<Message[]>>, setInputMessage: Dispatch<SetStateAction<string>>) {
    if (!inputMessage.trim()) return;
    const newMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: inputMessage,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    try {
        const temporaryMsg: Message = {
            id: 'temporary',
            role: 'temporary',
            content: '...',
        };
        setMessages((prev) => [...prev, temporaryMsg]);
        const response = await fetch(`/api/getUserResponse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentBot.id, content: newMsg.content })
        });
        const data = await response.json();
        const responseMsg: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: data.data.answer,
        };
        setMessages((prevMessages) => prevMessages.filter((message) => message.id !== 'temporary'));
        setMessages((prev) => [...prev, responseMsg]);
    } catch (error) {
        console.error('Помилка під час надсилання повідомлення:', error);
    }
};