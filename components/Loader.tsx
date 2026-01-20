
import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen }) => {
  const loaderContent = (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl border-2 border-slate-100 dark:border-white/5"></div>
        <div className="absolute inset-0 rounded-2xl border-b-2 border-primary animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
           <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-8 h-8 rounded-lg opacity-20 grayscale" alt="Logo" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Initializing</span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Deep Shop Secure Node</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex items-center justify-center">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-20">
      {loaderContent}
    </div>
  );
};

export default Loader;
