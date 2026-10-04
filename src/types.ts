import type { Dispatch, SetStateAction, RefObject } from 'react';

export interface fileImport {
  document_id: string;
  file_name: string;
  created_at: string;
  size: number;
  status: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'temporary';
  content: string;
  sourceDoc?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  status: string;
}

export interface DocumentListProps {
  handleDocClick: (name: string, id: string) => void;
  handleDocDelete: (id: string) => void;
  filteredDocs: DocumentItem[];
}

export interface MessagesListProps {
  messages: Message[]
}

export interface InputBarProps {
  inputMessage: string;
  setInputMessage: Dispatch<SetStateAction<string>>;
  currentBot: { name: string; id: string };
  handleSendMessage: () => void;
}

export interface UploadDocumentBlockProps {
  handleFileUpload: (e: React.FormEvent) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  handleClearFile: () => void;
  isUploading: boolean;
}

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
}

export interface LeftHeaderProps {
  documents: DocumentItem[];
}

export interface RightHeaderProps {
  currentBot: { name: string, id: string };
}