import { UploadDocumentBlockProps } from '@/types'
import { Upload, Send, Clock, X, } from 'lucide-react';
export const UploadDocumentBlock = ({ handleFileUpload, fileInputRef, handleFileSelect, selectedFile, handleClearFile, isUploading }: UploadDocumentBlockProps) => {
    return (
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
        </form>)
}