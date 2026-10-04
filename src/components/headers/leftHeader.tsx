import { LeftHeaderProps } from '@/types'

export const LeftHeader = ({ documents }: LeftHeaderProps) => {
    return (
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
    )
}
