import { RightHeaderProps } from '@/types'

export const RightHeader = ({ currentBot }: RightHeaderProps) => {
    return (
        <header className="h-14 px-5 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-zinc-900">
                    {currentBot.name}
                </span>
            </div>
        </header>
    )
}
