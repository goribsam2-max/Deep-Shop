
import React, { useState, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';

const SellPhone: React.FC<{ user: User | null }> = ({ user }) => {
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ deviceName: '', details: '', expectedPrice: '', condition: 'excellent' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return notify('Please login to continue', 'error');
    setLoading(true);
    try {
      await addDoc(collection(db, 'sell_requests'), {
        userId: user.uid,
        userName: user.name,
        deviceName: formData.deviceName,
        details: `${formData.details} | Condition: ${formData.condition}`,
        expectedPrice: Number(formData.expectedPrice),
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      notify('Valuation Request Sent!', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 animate-fade-in pb-24">
      <div className="text-center mb-12">
        <span className="text-primary font-bold text-[10px] uppercase tracking-[0.4em] mb-4 block">Hardware Appraisal</span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 uppercase">Trade-In Hub</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 p-8 md:p-12 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm">
         <div className="space-y-8">
            <div className="space-y-2">
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Device Name & Configuration</label>
               <input placeholder="E.g. iPhone 15 Pro Max 512GB Blue" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl outline-none font-bold" value={formData.deviceName} onChange={e => setFormData({...formData, deviceName: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Expected Price (৳)</label>
                  <input type="number" placeholder="Amount" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl font-black text-primary" value={formData.expectedPrice} onChange={e => setFormData({...formData, expectedPrice: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Overall Condition</label>
                  <select className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl font-bold uppercase text-[10px] outline-none" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
                     <option value="excellent">Flawless (10/10)</option>
                     <option value="good">Great (9/10)</option>
                     <option value="fair">Used (7/10)</option>
                     <option value="broken">Damaged / Needs Repair</option>
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Technical Notes</label>
               <textarea placeholder="State battery health, warranty status, etc." className="w-full p-6 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl outline-none h-32 font-medium text-sm leading-relaxed whitespace-pre-wrap" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} />
            </div>
         </div>

         <button 
           disabled={loading}
           className="w-full h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-125 transition-all mt-10 active:scale-[0.98]"
         >
           {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Submit Appraisal Request'}
         </button>
      </form>
    </div>
  );
};

export default SellPhone;
