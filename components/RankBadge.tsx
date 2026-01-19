
import React from 'react';
import { SellerRank } from '../types';

interface RankBadgeProps {
  rank: SellerRank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const RankBadge: React.FC<RankBadgeProps> = ({ rank, size = 'sm', showLabel = true }) => {
  const config = {
    bronze: { icon: 'fa-award', color: 'bg-bronze', label: 'Bronze Seller' },
    silver: { icon: 'fa-medal', color: 'bg-silver', label: 'Silver Seller' },
    gold: { icon: 'fa-crown', color: 'bg-gold text-black', label: 'Gold Seller' },
    platinum: { icon: 'fa-gem', color: 'bg-platinum text-slate-600', label: 'Platinum' },
    diamond: { icon: 'fa-gem', color: 'bg-sky-400 text-white', label: 'Diamond' },
    hero: { icon: 'fa-bolt', color: 'rank-hero text-white', label: 'Hero Seller' },
    grand: { icon: 'fa-star', color: 'rank-grand text-white', label: 'Grand Master' },
  };

  const current = config[rank] || config.bronze;
  const padding = size === 'sm' ? 'px-2 py-0.5' : size === 'md' ? 'px-3 py-1' : 'px-4 py-2';
  const fontSize = size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-xs';

  return (
    <div className={`${current.color} ${padding} rounded-full flex items-center gap-1.5 shadow-md animate-fade-in`}>
      <i className={`fas ${current.icon} ${size === 'sm' ? 'text-[8px]' : 'text-xs'}`}></i>
      {showLabel && <span className={`${fontSize} font-black uppercase tracking-widest`}>{current.label}</span>}
    </div>
  );
};

export default RankBadge;
