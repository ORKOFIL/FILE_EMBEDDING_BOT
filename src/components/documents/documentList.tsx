import {
    FileText,
    Trash2,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { DocumentItem, DocumentListProps } from '@/types';

export const DocumentList = ({ handleDocClick, handleDocDelete, filteredDocs }: DocumentListProps) => {
    return (
        <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="space-y-1">
                {filteredDocs.map((doc: DocumentItem) => (
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
    )
}