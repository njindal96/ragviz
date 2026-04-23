'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, Sparkles } from 'lucide-react';
import { parsePdfAction } from '@/app/actions';

const SAMPLE_TEXT = `Retrieval-Augmented Generation (RAG) is a technique that combines the strengths of large language models (LLMs) with the ability to retrieve relevant information from external knowledge sources.

In a traditional LLM setup, the model relies solely on information it was trained on. This means it may not have access to recent events, proprietary data, or specialized knowledge. RAG addresses this limitation by providing the model with relevant context retrieved from a document store at inference time.

The RAG pipeline consists of four main stages. First, documents are parsed and their raw text is extracted. Second, the text is split into smaller chunks — typically a few hundred characters each — to make retrieval more precise. Third, each chunk is converted into a numerical vector called an embedding, using a language model. These embeddings capture the semantic meaning of the text. Fourth, when a user asks a question, the question is also converted into an embedding, and the chunks with the most similar embeddings are retrieved using cosine similarity.

The retrieved chunks are then passed as context to the language model along with the user's question. This allows the model to generate accurate, grounded answers even for topics it was never trained on.

RAG is widely used in enterprise applications for document Q&A, customer support bots, code assistants, and more. It offers a practical way to keep AI systems up-to-date and factually accurate without the cost of retraining the model.

Vector databases like Pinecone, Weaviate, and Chroma are often used to store and search embeddings at scale. However, for small datasets, a simple in-memory brute-force cosine similarity search — like the one in this tool — works perfectly well and requires no infrastructure.`;

interface FileUploadProps {
    onTextLoaded: (text: string) => void;
    compact?: boolean;
}

export function FileUpload({ onTextLoaded, compact = false }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);

    const handleFile = async (file: File) => {
        if (file.type !== 'application/pdf') return;

        setIsParsing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const text = await parsePdfAction(formData);
            console.log('[Client] PDF parsed, text length:', text.length);
            onTextLoaded(text);
        } catch (e) {
            console.error(e);
            alert('Failed to parse PDF');
        } finally {
            setIsParsing(false);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, []);

    if (compact) {
        return (
            <div className="border rounded-lg p-4 flex items-center justify-between bg-emerald-50 border-emerald-100">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full border border-emerald-200">
                        <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-900">PDF Loaded</p>
                        <p className="text-xs text-emerald-600">Ready for processing</p>
                    </div>
                </div>
                <div>
                    <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        id="file-upload-compact"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <label
                        htmlFor="file-upload-compact"
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer hover:underline"
                    >
                        Replace
                    </label>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
        ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'}
      `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <div className="flex flex-col items-center gap-3">
                {isParsing ? (
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                ) : (
                    <Upload className="w-10 h-10 text-gray-400" />
                )}
                <div className="space-y-1">
                    <p className="font-medium text-gray-800">{isParsing ? 'Parsing PDF...' : 'Drop your PDF here'}</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                </div>
                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <label
                    htmlFor="file-upload"
                    className="btn btn-secondary cursor-pointer text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium"
                >
                    Select File
                </label>

                <div className="flex items-center gap-2 mt-1 w-full">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                <button
                    onClick={() => onTextLoaded(SAMPLE_TEXT)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors group"
                >
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Try with a sample document
                </button>
                <p className="text-xs text-gray-400">A short passage about RAG — perfect for exploring the tool</p>
            </div>
        </div>
    );
}
