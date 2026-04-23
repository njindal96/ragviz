'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
    content: string;
    className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom'>('top');
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (visible && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPosition(rect.top < 120 ? 'bottom' : 'top');
        }
    }, [visible]);

    return (
        <span
            ref={ref}
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500 cursor-help transition-colors" />
            {visible && (
                <span
                    className={`
                        absolute z-50 w-56 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-xl leading-relaxed
                        ${position === 'top'
                            ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
                            : 'top-full mt-2 left-1/2 -translate-x-1/2'
                        }
                    `}
                >
                    {content}
                    {/* Arrow */}
                    <span className={`
                        absolute left-1/2 -translate-x-1/2 w-0 h-0
                        ${position === 'top'
                            ? 'top-full border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800'
                            : 'bottom-full border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800'
                        }
                    `} />
                </span>
            )}
        </span>
    );
}
