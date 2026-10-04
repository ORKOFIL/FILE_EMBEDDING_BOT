import { Search } from 'lucide-react';
import { SearchBarProps } from '@/types'

export const SearchBar = ({ searchQuery, setSearchQuery }: SearchBarProps) => {
    return (
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
    )
}