import { Send } from 'lucide-react';
import { InputBarProps } from '@/types'

export const InputBar = ({ inputMessage, setInputMessage, currentBot, handleSendMessage }: InputBarProps) => {
    return (
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
    )
}