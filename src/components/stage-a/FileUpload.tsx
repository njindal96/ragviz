'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { parsePdfAction } from '@/app/actions';

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
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
      `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <div className="flex flex-col items-center gap-4">
                {isParsing ? (
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                ) : (
                    <Upload className="w-12 h-12 text-gray-400" />
                )}
                <div className="space-y-1">
                    <p className="font-medium">Drop your PDF here</p>
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
                    className="btn btn-secondary cursor-pointer"
                >
                    Select File
                </label>
            </div>
        </div>
    );
}
