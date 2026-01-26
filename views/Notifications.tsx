
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { User, Notification } from '../types';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Notifications: React.FC<{ user: User }> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'users', user.uid, 'notifications'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      setNotifications(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    });
    return () => unsub();
  }, [user.uid]);

  const markAll = async (read: boolean) => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'notifications'));
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { read });
      });
      await batch.commit();
      notify(read ? 'সবগুলো পড়া হয়েছে' : 'সবগুলো অপঠিত করা হয়েছে', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { read: true });
    } catch (err) {}
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black animate-fade-in pb-32">
      <div className="px-8 pt-12 pb-6">
        <div className="flex items-center gap-5 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
            <i className="fas fa-arrow-left text-slate-400"></i>
          </button>
          <h1 className="text-xl font-black uppercase brand-font">নোটিফিকেশন</h1>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => markAll(true)} className="flex-1 h-10 rounded-xl bg-slate-50 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500">সব পড়ুন</button>
          <button onClick={() => markAll(false)} className="flex-1 h-10 rounded-xl bg-slate-50 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest text-slate-500">সব অপঠিত করুন</button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {notifications.map((n) => (
          <div 
            key={n.id} 
            onClick={() => markAsRead(n.id)}
            className={`p-6 rounded-3xl transition-all ${n.read ? 'opacity-50' : 'bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5'}`}
          >
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}>
                <i className="fas fa-bell text-sm"></i>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-tight mb-1">{n.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{n.message}</p>
                <span className="text-[7px] font-black uppercase text-slate-300">
                  {n.timestamp?.seconds ? new Date(n.timestamp.seconds * 1000).toLocaleString() : 'এখনই'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="py-40 text-center opacity-20">
             <i className="fas fa-ghost text-6xl mb-4"></i>
             <p className="text-[10px] font-black uppercase tracking-widest">নোটিফিকেশন বক্স খালি</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
