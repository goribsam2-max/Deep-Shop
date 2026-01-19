
import React, { useState, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { NotificationContext } from '../App';
import Loader from '../components/Loader';
import { useNavigate } from 'react-router-dom';

const SellPhone: React.FC<{ user: User | null }> = ({ user }) => {
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deviceName: '',
    details: '',
    expectedPrice: '',
    condition: 'excellent'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return notify('Please login to sell your device', 'error');
    if (!formData.deviceName || !formData.details || !formData.expectedPrice) return notify('Complete all fields', 'error');

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
      notify('Sell request submitted! We will contact you soon.', 'success');
      navigate('/profile');
    } catch (e: any) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter mb-4 uppercase">Trade-In Hub</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Premium device valuation center</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2 space-y-6">
           <div className="glass p-6 rounded-[24px] border-white/40 shadow-lg">
              <h3 className="font-black text-md mb-2 uppercase">Official Review</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Experts assess your tech within 24 hours. Verified sellers get priority.</p>
           </div>
           <div className="glass p-6 rounded-[24px] border-primary/20 shadow-lg bg-primary/5">
              <h3 className="font-black text-md mb-2 text-primary uppercase">Deep Points</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Earn exclusive reward points for every successful flagship trade-in.</p>
           </div>
        </div>

        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="glass p-8 rounded-[32px] space-y-6 border-white/40 shadow-xl">
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Device Model</label>
                   <input 
                     placeholder="E.g. iPhone 15 Pro Max" 
                     className="w-full h-[50px] px-6 bg-slate-50 dark:bg-white/5 border border-white/20 rounded-xl outline-none font-bold"
                     value={formData.deviceName}
                     onChange={(e) => setFormData({...formData, deviceName: e.target.value})}
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected (৳)</label>
                      <input 
                        type="number"
                        placeholder="Amount" 
                        className="w-full h-[50px] px-6 bg-slate-50 dark:bg-white/5 border border-white/20 rounded-xl font-black text-primary"
                        value={formData.expectedPrice}
                        onChange={(e) => setFormData({...formData, expectedPrice: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Condition</label>
                      <select 
                        className="w-full h-[50px] px-6 bg-slate-50 dark:bg-white/5 border border-white/20 rounded-xl font-bold outline-none text-xs"
                        value={formData.condition}
                        onChange={(e) => setFormData({...formData, condition: e.target.value})}
                      >
                         <option value="excellent">Excellent</option>
                         <option value="good">Good</option>
                         <option value="fair">Fair</option>
                         <option value="broken">Broken</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">History & Specs</label>
                   <textarea 
                     placeholder="Describe condition, battery health, repairs..." 
                     className="w-full p-6 bg-slate-50 dark:bg-white/5 border border-white/20 rounded-xl outline-none h-32 font-medium text-xs"
                     value={formData.details}
                     onChange={(e) => setFormData({...formData, details: e.target.value})}
                   />
                </div>
             </div>

             <button 
               disabled={loading}
               className="w-full h-[50px] bg-primary text-white rounded-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest"
             >
               {loading ? <i className="fas fa-spinner animate-spin"></i> : 'SUBMIT FOR REVIEW'}
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellPhone;
