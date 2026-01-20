
import React from 'react';
import { SellerRank } from '../types';

interface RankBadgeProps {
  rank: SellerRank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'sm', showLabel = true }) => {
  const config = {
    bronze: { icon: 'fa-award', color: 'bg-slate-500 text-white border-slate-400', label: 'Bronze' },
    silver: { icon: 'fa-medal', color: 'bg-slate-300 text-slate-800 border-white', label: 'Silver' },
    gold: { icon: 'fa-crown', color: 'bg-gradient-to-br from-gold to-orange-500 text-black border-yellow-200', label: 'Gold Tier' },
    platinum: { icon: 'fa-gem', color: 'bg-gradient-to-br from-platinum to-slate-400 text-slate-900 border-white', label: 'Platinum' },
    diamond: { icon: 'fa-gem', color: 'bg-gradient-to-br from-sky-400 to-blue-600 text-white border-sky-200', label: 'Diamond' },
    hero: { icon: 'fa-bolt', color: 'rank-hero text-white border-orange-300 animate-pulse', label: 'Elite Hero' },
    grand: { icon: 'fa-star', color: 'rank-grand text-gold border-gold/50 shadow-[0_0_20px_rgba(255,215,0,0.3)]', label: 'Grand Master' },
  };

  const current = config[rank] || config.bronze;
  const padding = size === 'sm' ? 'px-3 py-1' : size === 'md' ? 'px-5 py-2' : 'px-8 py-3';
  const fontSize = size === 'sm' ? 'text-[9px]' : size === 'md' ? 'text-[11px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'text-[10px]' : 'text-sm';

  return (
    <div className={`${current.color} ${padding} rounded-full flex items-center justify-center gap-2 border shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-default`}>
      <i className={`fas ${current.icon} ${iconSize}`}></i>
      {showLabel && <span className={`${fontSize} font-black uppercase tracking-[0.2em]`}>{current.label}</span>}
    </div>
  );
};

export default RankBadge;
