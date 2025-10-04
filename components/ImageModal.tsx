import React, { useEffect } from 'react';
import { XIcon } from './icons/XIcon';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] p-4"
        onClick={e => e.stopPropagation()} // Prevent clicks inside the modal from closing it
      >
        <img 
            src={imageUrl} 
            alt="Annotated serve analysis" 
            className="w-full h-full object-contain rounded-lg shadow-2xl" 
        />
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors z-10"
          aria-label="Close image view"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>
      <style>{`
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-fast {
            animation: fade-in-fast 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ImageModal;