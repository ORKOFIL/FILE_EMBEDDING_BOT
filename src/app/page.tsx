'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { GET } from './api/getFiles/route';

interface DocumentItem {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  status: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'temporary';
  content: string;
  sourceDoc?: string;
}

interface fileImport {
  document_id: string;
  file_name: string;
  created_at: string;
  size: number;
  status: string;
}

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

  async function startPolling(url: string, intervalMs = 3000, docId: string) {
    while (true) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(docId)
        console.log('Отримані дані:', data.output);

        setDocuments((prevDocuments) =>
          prevDocuments.map((doc) =>
            doc.id === docId
              ? {
                ...doc,
                status: data.output,
              }
              : doc
          )
        );

        if (data.output == '[6/6] Finished' || data.output == 'ERROR') {
          break;
        }
      } catch (error) {
        console.error('Помилка під час polling:', error);
        //setStatus('ERROR')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      console.log(data.data.docId)
      const fileSizeFormatted =
        selectedFile.size > 1024 * 1024
          ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(selectedFile.size / 1024).toFixed(0)} KB`;

      const newDoc: DocumentItem = {
        id: data.data.docId,
        name: selectedFile.name,
        size: fileSizeFormatted,
        updatedAt: 'Щойно',
        status: '[1/6] Uploading file',
      };
      setDocuments((prev) => [newDoc, ...prev]);

      startPolling(`/api/getStatus/${data.data.docId}`, 1000, data.data.docId);

      handleClearFile();
    } catch (error) {
      console.error('Помилка під час відправки файлу:', error);
      alert('Не вдалося завантажити файл');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDocClick = (docName: string, docId: string) => {
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

  const handleDocDelete = async (docId: string) => {
    setDocuments(documents.filter((d) => d.id !== docId));
    await fetch(`/api/deleteFile/${docId}`)
  };

  const handleSendMessage = async () => {
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

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    async function loadDocs() {
      const response = await fetch(`api/getFiles`);
      const data = await response.json();
      const formattedDocs = data.output.map((file: fileImport) => ({
        id: file.document_id,
        name: file.file_name,
        size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`,
        updatedAt: new Date(file.created_at).toLocaleString('uk-UA'),
        status: file.status
      }))

      setDocuments(formattedDocs)
    }
    loadDocs()
  }, []);

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-800 font-sans antialiased">
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Knowledge Base Documents */}
        <section className="flex-1 flex flex-col border-r border-zinc-200 bg-white">
          {/* Header */}
          <header className="h-14 px-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h1 className="font-medium text-sm text-zinc-900 tracking-tight">
                База знань
              </h1>
              <span className="text-xs text-zinc-400 font-mono">
                ({documents.length})
              </span>
            </div>
          </header>

          {/* Upload Form Block (Вікно вибору файлу + POST кнопка) */}
          <form
            onSubmit={handleFileUpload}
            className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0"
          >
            {/* Прихований інпут */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt"
              className="hidden"
              id="rag-file-upload"
            />

            {/* Зона вибору файлу */}
            <label
              htmlFor="rag-file-upload"
              className="flex-1 flex items-center justify-between px-3 py-2 text-xs bg-white border border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-zinc-400 hover:bg-zinc-100/50 transition-all min-h-[38px]"
            >
              <div className="flex items-center gap-2 truncate">
                <Upload className="w-4 h-4 text-zinc-400 shrink-0" />
                {selectedFile ? (
                  <span className="font-medium text-zinc-800 truncate">
                    {selectedFile.name}{' '}
                    <span className="text-zinc-400 font-normal">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Оберіть файл (.pdf або .txt)...
                  </span>
                )}
              </div>

              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-600 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </label>

            {/* Кнопка POST відправки */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shrink-0 min-h-[38px]"
            >
              {isUploading ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Завантаження...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Завантажити</span>
                </>
              )}
            </button>
          </form>

          {/* Search & Toolbar */}
          <div className="p-4 border-b border-zinc-100 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Пошук за назвою документа..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:border-zinc-400 focus:bg-white text-zinc-800 placeholder-zinc-400 transition-all"
              />
            </div>
          </div>

          {/* Document Table / List */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="space-y-1">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDocClick(doc.name, doc.id)}
                  className="group flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:text-zinc-700 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-800 truncate">
                        {doc.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{doc.updatedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {doc.status === '[6/6] Finished' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Готово
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 animate-spin" />
                        {doc.status}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocDelete(doc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-600 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: AI Assistant Chat */}
        <section className="w-[420px] lg:w-[480px] flex flex-col bg-zinc-50/50">
          {/* Header */}
          <header className="h-14 px-5 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-zinc-900">
                {currentBot.name}
              </span>
            </div>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
              >
                <div
                  className={`max-w-[85%] text-xs leading-relaxed rounded-2xl px-3.5 py-2.5 ${msg.role === 'user'
                    ? 'bg-zinc-900 text-zinc-100 rounded-br-none'
                    : 'bg-white border border-zinc-200/80 text-zinc-800 shadow-sm rounded-bl-none'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-zinc-200 shrink-0">
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-1.5 focus-within:border-zinc-400 transition-all">
              <input
                type="text"
                placeholder="Заставте питання по завантаженому документу..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => currentBot.name !== 'ВИБЕРІТЬ ДОКУМЕНТ' && e.key === 'Enter' && handleSendMessage()}
                className="flex-1 text-xs bg-transparent px-2 focus:outline-none text-zinc-800 placeholder-zinc-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || currentBot.name == 'ВИБЕРІТЬ ДОКУМЕНТ'}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 text-white rounded-md transition-all"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}