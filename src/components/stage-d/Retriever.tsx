'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface RetrieverProps {
    onSearch: (query: string) => void;
    isProcessing: boolean;
    hasIndex: boolean;
}

export function Retriever({ onSearch, isProcessing, hasIndex }: RetrieverProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) onSearch(query);
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a question about the document..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={!hasIndex}
                />
                <button
                    type="submit"
                    disabled={!hasIndex || isProcessing || !query.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
            </form>
        </div>
    );
}
