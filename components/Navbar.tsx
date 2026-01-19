
import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onOpenMenu: () => void;
  hasUnreadNotify?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onOpenMenu, hasUnreadNotify }) => {
  return (
    <nav className="sticky top-0 z-50 glass h-20 flex items-center justify-between px-4 md:px-12 border-b border-slate-200 dark:border-white/10 shadow-lg">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenMenu}
          className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-600 dark:text-white hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          <i className="fas fa-bars-staggered text-xl"></i>
        </button>
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center text-white shadow-xl overflow-hidden border-2 border-white/20">
             <i className="fas fa-gem text-lg"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none">DEEP SHOP</span>
            <span className="text-[8px] font-black tracking-[0.2em] text-primary uppercase mt-0.5">Premium Official</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Link to="/profile?tab=notifications" className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
            <i className="far fa-bell text-2xl"></i>
          </Link>
          {hasUnreadNotify && (
            <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-danger rounded-full border-2 border-white dark:border-black animate-pulse"></span>
          )}
        </div>
        
        <Link to="/profile" className="flex items-center gap-3 group border-l border-slate-200 dark:border-white/10 pl-3">
          <div className="w-11 h-11 bg-slate-200 dark:bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-all shadow-md">
            {user ? (
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2e8b57&color=fff&size=128`} 
                alt={user.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <i className="fas fa-user-circle text-2xl text-slate-400"></i>
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
