
import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-primary' : 'bg-slate-900';
  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-max max-w-[90vw] animate-slide-up">
      <div className={`${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10`}>
        <i className={`fas ${icon} text-lg`}></i>
        <p className="text-[11px] font-black uppercase tracking-widest">{message}</p>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><i className="fas fa-times"></i></button>
      </div>
    </div>
  );
};

export default Notification;
