'use client';

import React, { useState, useRef, useEffect } from 'react';
import { loadDocs, docClick } from '@/hooks/useDocuments';
import { sendMessage } from '@/hooks/useChat';
import { fileUpload } from '@/hooks/useDocumentUpload'
import { Message, DocumentItem } from '@/types';
import { DocumentList } from '@/components/documents/documentList'
import { MessagesList } from '@/components/chat/messageList'
import { InputBar } from '@/components/chat/inputBar'
import { UploadDocumentBlock } from '@/components/documents/uploadDocument'
import { SearchBar } from '@/components/documents/searchBar'
import { LeftHeader } from '@/components/headers/leftHeader'
import { RightHeader } from '@/components/headers/rightHeader'

export default function MinimalRAGDashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'assistant',
      content: 'Вітаю. Виберіть документ.',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentBot, setCurrentBot] = useState({ name: 'ВИБЕРІТЬ ДОКУМЕНТ', id: '' });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    fileUpload(selectedFile, setIsUploading, setDocuments, setSelectedFile);
  };

  const handleDocClick = (docName: string, docId: string) => {
    docClick(docName, docId, setCurrentBot, setMessages, currentBot);
  };

  const handleDocDelete = async (docId: string) => {
    setDocuments(documents.filter((d) => d.id !== docId));
    await fetch(`/api/deleteFile/${docId}`)
  };

  const handleSendMessage = async () => {
    await sendMessage(inputMessage, currentBot, setMessages, setInputMessage);
  }

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    async function fetchDocuments() {
      setDocuments(await loadDocs())
    }
    fetchDocuments();
  }, []);

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-800 font-sans antialiased">
      <div className="flex flex-1 overflow-hidden">

        {/* Left Column: Documents */}
        <section className="flex-1 flex flex-col border-r border-zinc-200 bg-white">
          <LeftHeader documents={documents} />
          <UploadDocumentBlock handleFileUpload={handleFileUpload} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} selectedFile={selectedFile} handleClearFile={handleClearFile} isUploading={isUploading} />
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <DocumentList handleDocClick={handleDocClick} handleDocDelete={handleDocDelete} filteredDocs={filteredDocs} />
        </section>

        {/* Right Column: Chat */}
        <section className="w-[420px] lg:w-[480px] flex flex-col bg-zinc-50/50">
          <RightHeader currentBot={currentBot} />
          <MessagesList messages={messages} />
          <InputBar inputMessage={inputMessage} setInputMessage={setInputMessage} currentBot={currentBot} handleSendMessage={handleSendMessage} />
        </section>

      </div>
    </div>
  );
}