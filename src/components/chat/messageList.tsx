import { MessagesListProps } from '@/types'

export const MessagesList = ({ messages }: MessagesListProps) => {
    return (
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
    )
}