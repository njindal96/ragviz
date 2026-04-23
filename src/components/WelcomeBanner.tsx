'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const STORAGE_KEY = 'ragviz_welcome_dismissed';

const steps = [
    {
        num: '01',
        label: 'Parse',
        color: 'bg-violet-100 text-violet-700',
        borderColor: 'border-violet-200',
        desc: 'Upload a PDF. Its raw text is extracted and becomes the input to your pipeline.',
    },
    {
        num: '02',
        label: 'Chunk',
        color: 'bg-indigo-100 text-indigo-700',
        borderColor: 'border-indigo-200',
        desc: 'The text is split into smaller pieces ("chunks") — like paragraphs or sentences — so the AI can process each one individually.',
    },
    {
        num: '03',
        label: 'Index',
        color: 'bg-amber-100 text-amber-700',
        borderColor: 'border-amber-200',
        desc: 'Each chunk is converted into a vector (list of numbers) by an AI model running in your browser. Similar chunks will have similar vectors.',
    },
    {
        num: '04',
        label: 'Retrieve',
        color: 'bg-blue-100 text-blue-700',
        borderColor: 'border-blue-200',
        desc: 'Your question is also converted to a vector. We find the chunks whose vectors are closest to it — these are the most relevant passages.',
    },
];

export function WelcomeBanner() {
    const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
    const [collapsed, setCollapsed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
        setDismissed(isDismissed);
        setLoaded(true);
    }, []);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setDismissed(true);
    };

    if (!loaded || dismissed) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-100/60">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">
                        What is RAG? — A quick primer
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                        title={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={dismiss}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!collapsed && (
                <div className="px-5 py-4">
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        <strong>RAG</strong> (Retrieval-Augmented Generation) is a technique that lets AI answer questions about <em>your specific documents</em> — not just its training data.
                        This tool shows you every step of the pipeline, live in your browser.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {steps.map((step, i) => (
                            <div key={step.num} className="flex gap-3">
                                <div className={`flex flex-col items-center gap-1 flex-1 p-3 rounded-lg border ${step.borderColor} bg-white/70`}>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${step.color}`}>
                                        {step.num} {step.label}
                                    </span>
                                    <p className="text-xs text-gray-500 leading-relaxed text-center">
                                        {step.desc}
                                    </p>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="hidden md:flex items-center text-gray-300 text-lg font-light self-center">→</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-right">
                        ✦ Everything runs locally in your browser — no data is sent to any server.
                    </p>
                </div>
            )}
        </div>
    );
}
