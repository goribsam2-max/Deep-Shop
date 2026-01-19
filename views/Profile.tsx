
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { User, Order, SellRequest, SellerRank, Notification } from '../types';
import Loader from '../components/Loader';
import Receipt from '../components/Receipt';
import RankBadge from '../components/RankBadge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NotificationContext } from '../App';

interface ProfileProps { user: User; }

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'selling' | 'notifications'>('orders');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  useEffect(() => {
    if (!user?.uid) return;

    // Handle deep linking for notifications
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notifications') setActiveTab('notifications');

    setLoading(true);

    // Orders Listener
    const ordersQ = query(
      collection(db, 'orders'), 
      where('userInfo.userId', '==', user.uid), 
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribeOrders = onSnapshot(ordersQ, (snap) => {
      const ordersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      setOrders(ordersData);
      setLoading(false);
    }, (err) => {
      console.error("Orders listener error:", err);
      setLoading(false);
    });

    // Notifications Listener (User-Specific Subcollection)
    const notifQ = query(
      collection(db, 'users', user.uid, 'notifications'), 
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribeNotif = onSnapshot(notifQ, (snap) => {
      const notifData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      setNotifications(notifData);
    }, (err) => {
      console.error("Notifications listener error:", err);
    });

    return () => { 
      unsubscribeOrders(); 
      unsubscribeNotif(); 
    };
  }, [user?.uid, searchParams]);

  const markAsRead = async (id: string) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), { isRead: true });
    } catch (e) { console.error(e); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 min-h-screen pb-40 animate-fade-in">
      {/* Header Profile Section */}
      <div className="glass p-8 rounded-[30px] mb-12 flex flex-col md:flex-row items-center gap-8 border-white/20 shadow-xl relative overflow-hidden">
        <div className="w-28 h-28 rounded-[24px] border-4 border-primary/20 p-1 bg-white overflow-hidden shadow-lg">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2e8b57&color=fff&size=512`} alt={user.name} className="w-full h-full rounded-[18px] object-cover" />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">{user.name}</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-4">{user.email}</p>
          <div className="flex gap-3 justify-center md:justify-start">
             <RankBadge rank={user.rankOverride || 'bronze'} size="md" />
             <div className="px-4 py-1.5 glass rounded-full text-[9px] font-black uppercase tracking-widest text-primary border-white/40 shadow-sm">
               {user.rewardPoints || 0} POINTS
             </div>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="h-[50px] px-8 bg-danger text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all w-full md:w-auto">
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap p-2 bg-slate-200 dark:bg-white/5 rounded-2xl mb-12 w-max mx-auto shadow-inner border border-white/10">
        {['orders', 'selling', 'notifications'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)} 
            className={`px-8 h-[45px] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-primary shadow-md' : 'text-slate-500'}`}
          >
            {tab === 'notifications' ? `Inbox (${notifications.filter(n => !n.isRead).length})` : tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'orders' ? (
          orders.length > 0 ? orders.map(order => (
            <div key={order.id} className="glass rounded-[24px] overflow-hidden shadow-lg border-white/20">
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-50/50">
                <span className="font-black text-xs uppercase tracking-widest text-slate-500">REF #{order.id.substring(0,8)}</span>
                <button onClick={() => setSelectedReceipt(order)} className="h-[40px] px-5 bg-primary text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-sm">Receipt</button>
              </div>
              <div className="p-6">
                 <div className="space-y-4">
                    {order.products?.map((p, i) => (
                      <div key={i} className="flex gap-4 items-center">
                         <img src={p.image} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                         <div className="flex-1">
                           <p className="font-black text-sm tracking-tight">{p.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase">Qty: {p.quantity} • ৳{(p.price || 0).toLocaleString()}</p>
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="flex flex-col gap-2">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shipment State</span>
                       <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${order.status === 'delivered' ? 'bg-success/10 text-success border-success/20' : 'bg-orange-500/10 text-orange-600 border-orange-200'}`}>
                         {order.status}
                       </span>
                    </div>
                    <div className="text-right">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Due</span>
                       <span className="text-2xl font-black text-primary">৳{(order.totalAmount || 0).toLocaleString()}</span>
                    </div>
                 </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 opacity-30 flex flex-col items-center">
              <i className="fas fa-shopping-bag text-5xl mb-4"></i>
              <h3 className="text-sm font-black uppercase tracking-widest">No Orders Yet</h3>
            </div>
          )
        ) : activeTab === 'notifications' ? (
           <div className="space-y-4">
              {notifications.map(n => (
                <div key={n.id} onClick={() => markAsRead(n.id)} className={`glass p-6 rounded-[24px] border-white/20 flex gap-6 items-start cursor-pointer transition-all ${!n.isRead ? 'border-primary/40 bg-primary/5' : 'opacity-60'}`}>
                   <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><i className="fas fa-bell"></i></div>
                   <div className="flex-1">
                     <h4 className="font-black text-md mb-1 uppercase tracking-tight">{n.title}</h4>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                   </div>
                   {!n.isRead && <span className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-sm"></span>}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-20 opacity-30 flex flex-col items-center">
                  <i className="fas fa-inbox text-5xl mb-4"></i>
                  <h3 className="text-sm font-black uppercase tracking-widest">Inbox Empty</h3>
                </div>
              )}
           </div>
        ) : (
          <div className="text-center py-20 opacity-30 flex flex-col items-center">
            <i className="fas fa-box-open text-5xl mb-4"></i>
            <h3 className="text-sm font-black uppercase tracking-widest">No Trade Requests</h3>
          </div>
        )}
      </div>

      {selectedReceipt && <Receipt order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

export default Profile;
