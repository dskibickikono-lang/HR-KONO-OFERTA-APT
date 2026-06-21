import React, { useState, useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';

interface Props {
  title: string;
  content: string;
}

export const HelpPopover: React.FC<Props> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block ml-1 align-middle" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-[#c0a068] hover:text-[#b09058] focus:outline-none focus:ring-2 focus:ring-[#c0a068] rounded-full p-0.5 transition-colors"
        aria-label={`Pomoc: ${title}`}
      >
        <Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="md:hidden fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)} />

          {/* Popover Content */}
          <div className="fixed md:absolute bottom-0 left-0 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-2 w-full md:w-72 bg-white rounded-t-xl md:rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl border-t md:border border-gray-100 z-50 p-4 md:p-5 transition-transform duration-200 ease-out transform translate-y-0 md:transform-none">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-[#396542] text-sm leading-tight pr-4">{title}</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 -mt-1 -mr-1"
                aria-label="Zamknij pomoc"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
              {content}
            </p>
            {/* Desktop Triangle Arrow */}
            <div className="hidden md:block absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-gray-100 transform rotate-45" />
          </div>
        </>
      )}
    </div>
  );
};
