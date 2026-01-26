

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setItems(cart);
    };
    loadCart();
    window.addEventListener('cartUpdated', loadCart);
    return () => window.removeEventListener('cartUpdated', loadCart);
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-10 flex flex-col items-center justify-center py-40 animate-fade-in">
        <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-3xl text-slate-300 mb-8">
          <i className="fas fa-shopping-basket"></i>
        </div>
        <h2 className="text-xl font-black uppercase brand-font mb-2">আপনার কার্ট খালি!</h2>
        <p className="text-slate-400 mb-10 text-center text-xs font-bold uppercase tracking-tight">কার্টে এখনো কোন পণ্য যোগ করা হয়নি</p>
        <Link to="/" className="px-10 py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">
          কেনাকাটা শুরু করুন
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12 animate-fade-in pb-40">
      <h1 className="text-2xl font-black uppercase brand-font mb-10">আপনার <span className="text-primary">কার্ট</span></h1>
      
      <div className="flex flex-col gap-10">
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <div key={item.id} className="p-5 rounded-3xl border border-slate-100 dark:border-white/5 flex gap-5 items-center bg-white dark:bg-zinc-900/40">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-black p-4 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 line-clamp-1 mb-2 tracking-tight">{item.name}</h3>
                <span className="text-primary font-black text-sm brand-font">৳{item.price.toLocaleString()}</span>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-black px-4 py-2 rounded-xl">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-400 hover:text-primary transition-colors">
                      <i className="fas fa-minus text-[10px]"></i>
                    </button>
                    <span className="font-black text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-400 hover:text-primary transition-colors">
                      <i className="fas fa-plus text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 transition-all">
                <i className="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="w-full bg-slate-50 dark:bg-zinc-900/60 p-10 rounded-[44px] border border-slate-100 dark:border-white/5">
          <h2 className="text-sm font-black uppercase text-slate-400 mb-8 tracking-widest">অর্ডার সামারি</h2>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">সাবটোটাল</span>
              <span className="font-black text-sm">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400">ডেলিভারি চার্জ</span>
              <span className="text-green-500 font-black uppercase text-[8px]">পরের ধাপে হিসাব হবে</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/5 my-6"></div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest">সর্বমোট বিল</span>
              <span className="text-2xl font-black text-primary brand-font">৳{subtotal.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/checkout')}
            className="w-full h-18 bg-primary text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all"
          >
            অর্ডার করতে এগিয়ে যান
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
