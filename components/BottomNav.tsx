
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!auth.currentUser;

  return (
    <div className="fixed bottom-4 left-4 right-4 h-20 glass rounded-ios-lg shadow-2xl border border-white/40 dark:border-white/10 z-50 flex items-center justify-around px-2 md:hidden">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-home text-lg"></i>
        <span className="text-[8px] font-black uppercase mt-1">হোম</span>
      </NavLink>
      <NavLink 
        to="/cart" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-shopping-cart text-lg"></i>
        <span className="text-[8px] font-black uppercase mt-1">কার্ট</span>
      </NavLink>

      {/* Center Post Button */}
      <button 
        onClick={() => isLoggedIn ? navigate('/add-product') : navigate('/auth')}
        className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center -translate-y-6 shadow-[0_10px_25px_rgba(225,29,72,0.4)] border-4 border-white dark:border-black active:scale-90 transition-all"
      >
        <i className="fas fa-plus text-2xl"></i>
      </button>

      <NavLink 
        to="/explore" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-search text-lg"></i>
        <span className="text-[8px] font-black uppercase mt-1">এক্সপ্লোর</span>
      </NavLink>
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-user-circle text-lg"></i>
        <span className="text-[8px] font-black uppercase mt-1">প্রোফাইল</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
