import React, { useState, useContext } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return notify('দয়া করে অর্ডার আইডি দিন', 'info');
    
    setLoading(true);
    setOrder(null);
    try {
      // Direct getDoc call is matched by 'allow get: if true' in firestore.rules
      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        notify('অর্ডারটি খুঁজে পাওয়া যায়নি। আইডি চেক করুন।', 'error');
      }
    } catch (e: any) {
      console.error("Tracking Error:", e);
      // More descriptive error handling for permission issues
      if (e.code === 'permission-denied') {
        notify('অর্ডার ট্র্যাক করার অনুমতি নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।', 'error');
      } else {
        notify('অর্ডার লোড করতে সমস্যা হয়েছে।', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const stages: { status: OrderStatus; label: string; icon: string }[] = [
    { status: 'pending', label: 'অর্ডার পেন্ডিং', icon: 'fa-clock' },
    { status: 'processing', label: 'প্রসেসিং হচ্ছে', icon: 'fa-cog' },
    { status: 'packaging', label: 'প্যাকেজিং হচ্ছে', icon: 'fa-box-open' },
    { status: 'shipped', label: 'শিপড হয়েছে', icon: 'fa-truck-fast' },
    { status: 'delivered', label: 'ডেলিভারড', icon: 'fa-check-double' },
  ];

  const currentStageIndex = order ? stages.findIndex(s => s.status === order.status) : -1;

  return (
    <div className="flex-1 p-6 md:p-12 animate-fade-in bg-white dark:bg-black pb-40">
       <div className="flex items-center gap-4 mb-12 mt-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all border border-slate-100 dark:border-white/5">
             <i className="fas fa-chevron-left"></i>
          </button>
          <div className="flex flex-col">
             <h1 className="text-xl font-black uppercase tracking-tight brand-font leading-none">লাইভ <span className="text-primary">ট্র্যাকিং</span></h1>
             <p className="text-[7px] font-black uppercase tracking-[0.4em] text-slate-400 mt-1">Order Status System</p>
          </div>
       </div>

       {/* Professional Minimalist Search Bar */}
       <div className="mb-14">
          <form onSubmit={handleTrack} className="flex items-center bg-slate-50 dark:bg-zinc-900 rounded-[24px] p-2 pr-2 shadow-sm border border-slate-100 dark:border-white/5 focus-within:border-primary/20 transition-all">
             <div className="flex-1 px-4 flex items-center gap-4 text-slate-300 focus-within:text-primary transition-colors">
                <i className="fas fa-hashtag"></i>
                <input 
                  placeholder="অর্ডার আইডি দিন..." 
                  className="w-full h-12 bg-transparent outline-none font-bold text-sm placeholder:text-slate-300 text-slate-900 dark:text-white"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
             </div>
             <button 
               type="submit" 
               disabled={loading}
               className="h-12 px-8 bg-primary text-white rounded-[18px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all"
             >
               {loading ? <i className="fas fa-spinner animate-spin"></i> : 'ট্র্যাক করুন'}
             </button>
          </form>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-4 ml-2 tracking-widest">উদাহরণ: DS-INV-XXXXXX</p>
       </div>

       {order ? (
         <div className="space-y-12 animate-slide-up">
            <div className="p-8 bg-slate-50 dark:bg-zinc-900/50 rounded-[44px] border border-slate-100 dark:border-white/5 shadow-sm">
               <div className="flex justify-between items-end mb-12">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em] block mb-2">বর্তমান অবস্থা</span>
                    <h3 className="text-2xl font-black uppercase text-primary brand-font leading-none">{order.status}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em] block mb-2">সর্বমোট বিল</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">৳{(order.totalAmount || 0).toLocaleString()}</h3>
                  </div>
               </div>

               {/* Tracking Timeline */}
               <div className="relative pl-12 space-y-12">
                  <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-zinc-800"></div>
                  {stages.map((stage, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div key={idx} className={`relative flex items-center gap-8 ${!isCompleted ? 'opacity-20' : ''}`}>
                         <div className={`absolute -left-[32px] w-5 h-5 rounded-full z-10 flex items-center justify-center border-4 border-white dark:border-zinc-900 transition-all ${isCompleted ? 'bg-primary shadow-[0_0_12px_rgba(225,29,72,0.6)]' : 'bg-slate-300 dark:bg-zinc-800'}`}>
                            {isCompleted && <i className="fas fa-check text-[6px] text-white"></i>}
                         </div>
                         
                         <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-xl transition-all ${isCurrent ? 'bg-primary text-white scale-110 shadow-xl' : 'bg-slate-100 dark:bg-black text-slate-400'}`}>
                            <i className={`fas ${stage.icon}`}></i>
                         </div>
                         
                         <div>
                            <h4 className={`text-sm font-black uppercase tracking-tight ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{stage.label}</h4>
                            {isCurrent && <p className="text-[8px] font-bold text-primary uppercase mt-1 animate-pulse tracking-widest">বর্তমানে এখানে আছে</p>}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="bg-primary/5 p-10 rounded-[44px] border border-primary/10">
               <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.4em] mb-8">অর্ডার ডিটেইলস</h4>
               <div className="space-y-4 mb-8">
                  {order.products?.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-bold">
                       <span className="text-slate-500 uppercase truncate max-w-[200px]">{p.name} x {p.quantity}</span>
                       <span className="text-slate-900 dark:text-white font-black">৳{(p.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
               </div>
               <div className="pt-8 border-t border-primary/10 space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">ডেলিভারি ঠিকানা</span>
                    <span className="text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 leading-relaxed">{order.address?.fullAddress}</span>
                  </div>
               </div>
            </div>
         </div>
       ) : !loading && (
         <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <div className="w-24 h-24 rounded-[40px] border-4 border-dashed border-slate-200 flex items-center justify-center mb-6">
               <i className="fas fa-truck-ramp-box text-3xl"></i>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center">আইডি দিয়ে ট্র্যাকিং করুন</p>
         </div>
       )}
    </div>
  );
};

export default OrderTracking;