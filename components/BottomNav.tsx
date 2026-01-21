
import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-4 right-4 h-20 glass rounded-ios-lg shadow-2xl border border-white/40 dark:border-white/10 z-50 flex items-center justify-around px-2 md:hidden">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-home text-lg"></i>
        <span className="text-[9px] font-bold mt-1">Home</span>
      </NavLink>
      <NavLink 
        to="/cart" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-shopping-cart text-lg"></i>
        <span className="text-[9px] font-bold mt-1">Cart</span>
      </NavLink>
      <NavLink 
        to="/sell-phone" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-mobile-screen text-lg"></i>
        <span className="text-[9px] font-bold mt-1">Sell</span>
      </NavLink>
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400'}`}
      >
        <i className="fas fa-user-circle text-lg"></i>
        <span className="text-[9px] font-bold mt-1">Account</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;
