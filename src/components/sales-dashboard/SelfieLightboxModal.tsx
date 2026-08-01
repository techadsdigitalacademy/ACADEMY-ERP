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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative max-w-lg w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl p-2 flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <img 
          src={enlargedSelfie} 
          alt="Enlarged Selfie" 
          className="w-full max-h-[85vh] object-contain rounded-xl"
        />
      </div>
    </div>
  );
};
