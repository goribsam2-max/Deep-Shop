
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { User, Order, Notification, SellRequest, Product, OrderStatus } from '../types';
import Loader from '../components/Loader';
import Receipt from '../components/Receipt';
import RankBadge from '../components/RankBadge';
import { useSearchParams, Link } from 'react-router-dom';
import { NotificationContext } from '../App';
import { sendTelegramNotification } from '../services/telegram';

const Profile: React.FC<{ user: User }> = ({ user }) => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [myMentions, setMyMentions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'selling' | 'notifications' | 'mentions'>('orders');
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);
  const { notify } = useContext(NotificationContext);

  const [showPromoteModal, setShowPromoteModal] = useState<Product | null>(null);
  const [promoteStep, setPromoteStep] = useState(1);
  const [promotePlan, setPromotePlan] = useState<'3days' | '7days'>('3days');
  const [promoteMethod, setPromoteMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [promoteTxnId, setPromoteTxnId] = useState('');
  const [submittingPromote, setSubmittingPromote] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const tabParam = searchParams.get('tab');
    if (tabParam === 'notifications') setActiveTab('notifications');
    else if (tabParam === 'selling') setActiveTab('selling');
    else if (tabParam === 'mentions') setActiveTab('mentions');

    const unsubscribeOrders = onSnapshot(query(collection(db, 'orders'), where('userInfo.userId', '==', user.uid)), (snap) => {
      const ords = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Order);
      ords.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setOrders(ords);
    });

    const unsubscribeRequests = onSnapshot(query(collection(db, 'sell_requests'), where('userId', '==', user.uid)), (snap) => {
      const reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SellRequest);
      reqs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setSellRequests(reqs);
    });

    const unsubscribeMentions = onSnapshot(query(collection(db, 'products'), where('mentionedUserId', '==', user.uid)), (snap) => {
      setMyMentions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const unsubscribeNotif = onSnapshot(query(collection(db, 'users', user.uid, 'notifications')), (snap) => {
      const notifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
      notifs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => { unsubscribeOrders(); unsubscribeNotif(); unsubscribeRequests(); unsubscribeMentions(); };
  }, [user?.uid, searchParams]);

  const togglePushNotifications = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        pushNotificationsEnabled: !user.pushNotificationsEnabled
      });
      notify(`Notifications ${!user.pushNotificationsEnabled ? 'Enabled' : 'Disabled'}`, 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleAllNotifications = async (isRead: boolean) => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notif.id);
        batch.update(notifRef, { isRead });
      });
      await batch.commit();
      notify(`All notifications marked as ${isRead ? 'read' : 'unread'}`, 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const handlePromoteSubmit = async () => {
    if (!showPromoteModal || !promoteTxnId) return notify('Transaction ID is required', 'error');
    setSubmittingPromote(true);
    try {
      const price = promotePlan === '3days' ? 500 : 1500;
      const requestData: any = {
        productId: showPromoteModal.id,
        productName: showPromoteModal.name,
        userId: user.uid,
        userName: user.name,
        plan: promotePlan,
        price,
        paymentMethod: promoteMethod,
        transactionId: promoteTxnId,
        status: 'pending',
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'promote_requests'), requestData);
      let tgMsg = `🚀 <b>New Promotion Request!</b>\nCustomer: ${user.name}\nProduct: ${showPromoteModal.name}\nPlan: ${promotePlan}\nPayment: ৳${price} via ${promoteMethod}\nTxn ID: ${promoteTxnId}`;
      await sendTelegramNotification(tgMsg);
      notify('Promotion request submitted!', 'success');
      setShowPromoteModal(null);
      setPromoteStep(1);
      setPromoteTxnId('');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmittingPromote(false); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] mb-8 flex flex-col md:flex-row items-center gap-10 border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="w-24 h-24 rounded-full border-4 border-slate-50 p-1 bg-white relative shrink-0">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} alt={user.name} className="w-full h-full rounded-full object-cover" />
          <div className="absolute -bottom-1 -right-1">
             <RankBadge rank={user.rankOverride || 'bronze'} size="sm" showLabel={false} />
          </div>
        </div>
        <div className="text-center md:text-left flex-1 min-w-0">
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight truncate mb-2">{user.name}</h1>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
             <RankBadge rank={user.rankOverride || 'bronze'} size="sm" />
             <div className="px-4 py-1.5 bg-primary/5 rounded-full text-[8px] font-black uppercase tracking-widest text-primary border border-primary/10">
               {user.rewardPoints || 0} Reward Points
             </div>
             <button onClick={togglePushNotifications} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${user.pushNotificationsEnabled ? 'bg-success/10 text-success border-success/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                Push: {user.pushNotificationsEnabled ? 'ON' : 'OFF'}
             </button>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="h-10 px-8 border border-red-500/20 text-red-500 font-bold rounded-xl uppercase tracking-widest text-[8px] hover:bg-red-50 transition-all">Sign Out</button>
      </div>

      <div className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl p-1 mb-10 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-[400px]">
          {['orders', 'mentions', 'selling', 'notifications'].map((tab: any) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-slate-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {orders.map(o => (
              <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col gap-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/10"><i className="fas fa-box-open text-slate-300"></i></div>
                     <div>
                       <h4 className="font-bold text-[11px] uppercase tracking-tighter">Order ID: #{o.id.substring(0,8).toUpperCase()}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Balance: <span className="text-primary">৳{o.totalAmount?.toLocaleString()}</span></p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setSelectedReceipt(o)} className="flex-1 md:flex-none h-11 px-8 bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-white/10">View Receipt</button>
                    <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border ${o.status === 'delivered' ? 'bg-success/10 text-success border-success/20' : 'bg-primary/5 text-primary border-primary/20'}`}>
                      {o.status}
                    </span>
                  </div>
                </div>

                {/* Tracking Stepper */}
                <div className="px-2 md:px-10">
                  <div className="relative flex justify-between items-center w-full">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/5 -translate-y-1/2 -z-10"></div>
                    {['pending', 'processing', 'packaging', 'shipped', 'delivered'].map((step, idx) => {
                      const statusIndex = ['pending', 'processing', 'packaging', 'shipped', 'delivered'].indexOf(o.status);
                      const isCompleted = idx <= statusIndex;
                      const isCurrent = idx === statusIndex;
                      
                      return (
                        <div key={step} className="flex flex-col items-center gap-3 relative z-10">
                          <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${isCompleted ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-white/5'}`}>
                            {isCompleted && <i className="fas fa-check text-[8px] text-white"></i>}
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-widest text-center ${isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-300'} ${isCurrent ? 'text-primary' : ''}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center py-24 opacity-20 uppercase font-black text-[10px] tracking-[0.5em]">No Active Orders</p>}
          </div>
        )}

        {/* Existing Mentions Tab */}
        {activeTab === 'mentions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myMentions.map(p => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex gap-6 items-center shadow-sm relative overflow-hidden group">
                {p.isPromoted && <div className="absolute top-0 right-0 bg-primary text-white text-[7px] font-black px-3 py-1 uppercase rounded-bl-xl tracking-widest animate-pulse">Active Ad</div>}
                <div className="w-20 h-20 bg-slate-50 dark:bg-black/20 rounded-2xl p-4 flex-shrink-0">
                  <img src={p.image} className="w-full h-full object-contain" alt={p.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs uppercase truncate mb-1">{p.name}</h4>
                  <p className="text-primary font-black text-xs mb-4">৳{p.price?.toLocaleString() || '0'}</p>
                  <div className="flex gap-2">
                     <Link to={`/product/${p.id}`} className="px-4 h-8 bg-slate-50 dark:bg-white/5 rounded-lg text-[8px] font-black uppercase flex items-center justify-center">View Item</Link>
                     <button onClick={() => setShowPromoteModal(p)} className="px-4 h-8 bg-primary text-white rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110"><i className="fas fa-rocket"></i> Promote</button>
                  </div>
                </div>
              </div>
            ))}
            {myMentions.length === 0 && <p className="col-span-full text-center py-20 opacity-20 uppercase font-black text-[10px] tracking-[0.2em]">No mentions found</p>}
          </div>
        )}

        {/* Existing Selling Tab */}
        {activeTab === 'selling' && (
          <div className="space-y-4">
            {sellRequests.map(req => (
              <div key={req.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex justify-between items-center shadow-sm">
                <div>
                   <h4 className="font-bold text-xs uppercase">{req.deviceName}</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Expected: ৳{req.expectedPrice?.toLocaleString() || '0'} | Status: <span className={req.status === 'approved' ? 'text-green-500' : 'text-primary'}>{req.status}</span></p>
                </div>
                <i className={`fas ${req.status === 'approved' ? 'fa-check-circle text-green-500' : 'fa-clock text-slate-200'} text-xl`}></i>
              </div>
            ))}
            {sellRequests.length === 0 && <p className="text-center py-20 opacity-20 uppercase font-black text-[10px] tracking-[0.2em]">No sell requests found</p>}
          </div>
        )}

        {/* Existing Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {notifications.length > 0 && (
              <div className="flex justify-end gap-3 mb-6">
                <button onClick={() => toggleAllNotifications(true)} className="text-[9px] font-black uppercase text-slate-400 hover:text-primary transition-colors">Mark all read</button>
                <button onClick={() => toggleAllNotifications(false)} className="text-[9px] font-black uppercase text-slate-400 hover:text-primary transition-colors">Mark all unread</button>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id} className={`bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex gap-5 shadow-sm transition-all ${!notif.isRead ? 'border-l-4 border-l-primary' : 'opacity-60'}`}>
                 {notif.image && (
                   <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-white/5">
                     <img src={notif.image} className="w-full h-full object-cover" alt="Notification" />
                   </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-xs uppercase mb-1 truncate">{notif.title}</h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{notif.message}</p>
                   <p className="text-[8px] font-bold text-slate-300 uppercase mt-3">{notif.timestamp?.seconds ? new Date(notif.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</p>
                 </div>
                 {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1 animate-pulse"></div>}
              </div>
            ))}
            {notifications.length === 0 && <p className="text-center py-20 opacity-20 uppercase font-black text-[10px] tracking-[0.2em]">No notifications yet</p>}
          </div>
        )}
      </div>

      {showPromoteModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-lg glass rounded-[40px] p-8 shadow-2xl animate-slide-up border border-white/20">
            <h2 className="text-2xl font-black uppercase tracking-tight text-center mb-10">Promote Product</h2>
            {promoteStep === 1 ? (
              <div className="space-y-4">
                <button onClick={() => { setPromotePlan('3days'); setPromoteStep(2); }} className="w-full p-6 bg-white dark:bg-white/5 rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-primary flex justify-between items-center group transition-all">
                  <div className="text-left">
                    <h4 className="font-black text-xs uppercase mb-1">Standard (3 Days)</h4>
                    <p className="text-[9px] text-slate-400 uppercase">80% Sell Guarantee</p>
                  </div>
                  <span className="font-black">৳500</span>
                </button>
                <button onClick={() => { setPromotePlan('7days'); setPromoteStep(2); }} className="w-full p-6 bg-slate-900 text-white rounded-2xl border-2 border-primary/20 hover:border-primary flex justify-between items-center transition-all">
                  <div className="text-left">
                    <h4 className="font-black text-xs uppercase mb-1">Premium (7 Days)</h4>
                    <p className="text-[9px] text-white/40 uppercase">Top Priority Ad</p>
                  </div>
                  <span className="font-black text-primary">৳1500</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-center"><p className="text-[10px] font-bold text-slate-500 uppercase">Send Money To: <b className="text-primary">01778953114</b></p></div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setPromoteMethod('bkash')} className={`h-11 rounded-xl font-black uppercase text-[9px] border-2 transition-all ${promoteMethod === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-500' : 'border-slate-100 dark:border-white/10'}`}>bKash</button>
                   <button onClick={() => setPromoteMethod('nagad')} className={`h-11 rounded-xl font-black uppercase text-[9px] border-2 transition-all ${promoteMethod === 'nagad' ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-slate-100 dark:border-white/10'}`}>Nagad</button>
                </div>
                <input placeholder="ENTER TRX ID" className="w-full h-14 bg-slate-50 dark:bg-black/20 rounded-xl px-6 text-center font-black outline-none border border-transparent focus:border-primary transition-all uppercase tracking-widest" value={promoteTxnId} onChange={e => setPromoteTxnId(e.target.value)} />
                <button onClick={handlePromoteSubmit} disabled={submittingPromote} className="w-full h-14 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                  {/* Fixed typo: changed submittingPush to submittingPromote */}
                  {submittingPromote ? <i className="fas fa-spinner animate-spin"></i> : 'Confirm Request'}
                </button>
                <button onClick={() => setPromoteStep(1)} className="w-full text-[8px] font-black uppercase text-slate-400">Back to plans</button>
              </div>
            )}
            <button onClick={() => { setShowPromoteModal(null); setPromoteStep(1); }} className="w-full mt-6 text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-red-500 transition-colors text-center">Close Marketplace</button>
          </div>
        </div>
      )}

      {selectedReceipt && <Receipt order={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  );
};

export default Profile;
