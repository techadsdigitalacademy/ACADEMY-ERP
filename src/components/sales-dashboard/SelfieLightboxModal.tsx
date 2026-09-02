import React from 'react';
import { X } from 'lucide-react';

interface SelfieLightboxModalProps {
  enlargedSelfie: string | null;
  onClose: () => void;
}

export const SelfieLightboxModal: React.FC<SelfieLightboxModalProps> = ({
  enlargedSelfie,
  onClose
}) => {
  if (!enlargedSelfie) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="relative w-full max-w-[400px] rounded-lg overflow-hidden bg-card dark:bg-card border border-border dark:border-border shadow-2xl p-4 sm:p-6 flex flex-col items-center gap-4">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted dark:bg-muted hover:bg-muted dark:hover:bg-muted text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-full">
          <h3 className="font-bold text-foreground dark:text-white text-base tracking-wide text-center mb-4">
            Attendance Selfie
          </h3>
          <img 
            src={enlargedSelfie} 
            alt="Enlarged Selfie" 
            className="w-full aspect-square object-cover rounded-md shadow-inner bg-muted dark:bg-muted"
          />
        </div>
      </div>
    </div>
  );
};
