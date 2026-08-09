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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-[400px] rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 flex flex-col items-center gap-4">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors z-10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="w-full">
          <h3 className="font-bold text-slate-800 dark:text-white text-base tracking-wide text-center mb-4">
            Attendance Selfie
          </h3>
          <img 
            src={enlargedSelfie} 
            alt="Enlarged Selfie" 
            className="w-full aspect-square object-cover rounded-xl shadow-inner bg-slate-100 dark:bg-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
