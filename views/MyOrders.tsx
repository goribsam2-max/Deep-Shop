import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, Order } from '../types';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import Receipt from '../components/Receipt';

const MyOrders: React.FC<{ user: User }> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;

    // Simple query. Sorting is handled client-side to avoid index issues.
    const q = query(
      collection(db, 'orders'), 
      where('userInfo.userId', '==', user.uid)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      // Client-side sort by timestamp descending
      const sorted = data.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(sorted);
      setLoading(false);
    }, (err) => {
      console.error("MyOrders Snapshot Error:", err.code, err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black animate-fade-in pb-32">
      <div className="px-8 pt-12 pb-6 flex items-center gap-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5">
          <i className="fas fa-arrow-left text-slate-400"></i>
        </button>
        <h1 className="text-xl font-black uppercase brand-font">আমার <span className="text-primary">অর্ডার</span></h1>
      </div>

      <div className="px-4 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="p-6 border border-slate-100 dark:border-white/5 rounded-[32px] bg-white dark:bg-zinc-900/40 shadow-sm">
            <div className="flex justify-between items-start mb-6">
               <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ইনভয়েস নম্বর</span>
                  <p className="text-xs font-black uppercase text-primary">#{order.id.substring(0,10)}</p>
               </div>
               <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">স্ট্যাটাস</span>
                  <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase border ${order.status === 'delivered' ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-black dark:border-white/10'}`}>
                    {order.status}
                  </span>
               </div>
            </div>

            <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl">
               {order.products?.map((p, i) => (
                 <div key={i} className="flex justify-between text-xs font-bold">
                    <span className="uppercase text-slate-500 truncate max-w-[200px]">{p.name} x {p.quantity}</span>
                    <span className="text-slate-900 dark:text-white">৳{(p.price || 0).toLocaleString()}</span>
                 </div>
               ))}
               <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400">সর্বমোট বিল</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">৳{(order.totalAmount || 0).toLocaleString()}</span>
               </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedReceipt(order)}
                className="flex-1 h-12 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-black text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                রিসিট দেখুন
              </button>
              <button 
                onClick={() => navigate('/track-order')}
                className="flex-1 h-12 rounded-2xl border border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all text-slate-500"
              >
                লাইভ ট্র্যাকিং
              </button>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="py-40 flex flex-col items-center justify-center opacity-20">
             <div className="w-20 h-20 border-4 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-box-open text-3xl"></i>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.5em]">কোন অর্ডার পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {selectedReceipt && <Receipt order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

export default MyOrders;