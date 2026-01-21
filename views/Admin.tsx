
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Order, Product, User, SiteConfig, SellRequest, PromoteRequest, SellerRank } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sellRequests, setSellRequests] = useState<SellRequest[]>([]);
  const [promoteRequests, setPromoteRequests] = useState<PromoteRequest[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ 
    bannerVisible: false, bannerText: '', bannerType: 'info',
    metaTitle: '', metaDescription: '', ogImage: '', keywords: '', oneSignalAppId: '', oneSignalRestKey: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'requests' | 'settings' | 'promotes' | 'push'>('orders');
  const { notify } = useContext(NotificationContext);

  // Modal States
  const [showProductModal, setShowProductModal] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', category: 'mobile', price: 0, description: '', image: '', stock: 'instock'
  });
  const [personalMsgUser, setPersonalMsgUser] = useState<User | null>(null);
  const [personalMsgContent, setPersonalMsgContent] = useState({ title: '', message: '' });

  // Broadcaster State
  const [pushForm, setPushForm] = useState({ title: '', message: '', image: '' });
  const [sendingPush, setSendingPush] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'settings') {
        const snap = await getDocs(collection(db, 'site_config'));
        const config = snap.docs.find(d => d.id === 'global');
        if (config) setSiteConfig(config.data() as SiteConfig);
      } else {
        const qColl = activeTab === 'orders' ? 'orders' : 
                     activeTab === 'promotes' ? 'promote_requests' :
                     activeTab === 'products' ? 'products' :
                     activeTab === 'users' ? 'users' :
                     activeTab === 'requests' ? 'sell_requests' : 'site_config';
        
        const snap = await getDocs(collection(db, qColl));
        const data = snap.docs.map(d => ({ 
          id: d.id, 
          uid: d.id, 
          ...d.data() 
        })).sort((a: any, b: any) => {
          const timeA = a.timestamp?.seconds || a.createdAt?.seconds || 0;
          const timeB = b.timestamp?.seconds || b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        
        if (activeTab === 'orders') setOrders(data as any as Order[]);
        if (activeTab === 'promotes') setPromoteRequests(data as any as PromoteRequest[]);
        if (activeTab === 'products') setProducts(data as any as Product[]);
        if (activeTab === 'users') setUsers(data as any as User[]);
        if (activeTab === 'requests') setSellRequests(data as any as SellRequest[]);
      }
    } catch (err: any) { 
      console.error("Admin Fetch Error:", err);
      notify('Failed to load data.', 'error'); 
    } 
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: string, coll: string, status: string) => {
    try {
      await updateDoc(doc(db, coll, id), { status });
      notify(`Status Updated to ${status}`, 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      notify('Product Removed', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showProductModal?.id) {
        await updateDoc(doc(db, 'products', showProductModal.id), productForm);
        notify('Product Updated', 'success');
      } else {
        await addDoc(collection(db, 'products'), { ...productForm, views: 0, timestamp: serverTimestamp() });
        notify('Product Added', 'success');
      }
      setShowProductModal(null);
      setProductForm({ name: '', category: 'mobile', price: 0, description: '', image: '', stock: 'instock' });
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const sendPersonalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalMsgUser || !personalMsgContent.title) return;
    try {
      await addDoc(collection(db, 'users', personalMsgUser.uid, 'notifications'), {
        ...personalMsgContent,
        isRead: false,
        timestamp: serverTimestamp()
      });
      notify(`Message sent to ${personalMsgUser.name}`, 'success');
      setPersonalMsgUser(null);
      setPersonalMsgContent({ title: '', message: '' });
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const updateRank = async (uid: string, rank: SellerRank) => {
    try {
      await updateDoc(doc(db, 'users', uid), { rankOverride: rank });
      notify(`Rank updated to ${rank}`, 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleBan = async (u: User) => {
    try {
      await updateDoc(doc(db, 'users', u.uid), { isBanned: !u.isBanned });
      notify(`User ${!u.isBanned ? 'Banned' : 'Unbanned'}`, 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const sendGlobalPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushForm.title || !pushForm.message) return notify('Required fields missing', 'error');
    setSendingPush(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of usersSnap.docs) {
        await addDoc(collection(db, 'users', uDoc.id, 'notifications'), {
          ...pushForm,
          isRead: false,
          timestamp: serverTimestamp()
        });
      }

      if (siteConfig.oneSignalAppId && siteConfig.oneSignalRestKey) {
        await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${siteConfig.oneSignalRestKey}`
          },
          body: JSON.stringify({
            app_id: siteConfig.oneSignalAppId,
            included_segments: ["All"],
            headings: { en: pushForm.title },
            contents: { en: pushForm.message },
            big_picture: pushForm.image || undefined
          })
        });
      }

      notify('Notification Sent', 'success');
      setPushForm({ title: '', message: '', image: '' });
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSendingPush(false); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen pb-40">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
        <h1 className="text-3xl font-black uppercase tracking-tight">Admin Dashboard</h1>
        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-white/5 rounded-2xl gap-1 overflow-x-auto no-scrollbar max-w-full">
          {['orders', 'promotes', 'products', 'users', 'requests', 'settings', 'push'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 h-10 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white shadow-xl' : 'text-slate-500 hover:text-primary'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in">
          
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length > 0 ? orders.map(o => (
                <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row justify-between gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase">#{o.id.substring(0,8)}</span>
                      <h4 className="font-bold text-xs uppercase truncate">{o.userInfo?.userName || 'Customer'}</h4>
                    </div>
                    <div className="space-y-2">
                       {o.products?.map((p, i) => (
                         <div key={i} className="flex items-center gap-4 text-[11px] font-bold">
                           <img src={p.image} className="w-8 h-8 rounded-lg bg-slate-50 object-contain" alt="" />
                           <span className="text-slate-500">{p.quantity}x</span>
                           <span className="truncate">{p.name}</span>
                         </div>
                       ))}
                    </div>
                    <p className="mt-4 text-[11px] font-black uppercase tracking-widest">Total: <span className="text-primary">৳{o.totalAmount?.toLocaleString()}</span></p>
                  </div>
                  <div className="flex flex-col justify-between items-end gap-4 shrink-0">
                    <select 
                      value={o.status} 
                      onChange={(e) => handleStatusChange(o.id, 'orders', e.target.value)}
                      className="w-full md:w-48 h-12 bg-slate-50 dark:bg-black/40 rounded-xl px-5 text-[10px] font-black uppercase outline-none border border-transparent focus:border-primary transition-all"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="packaging">Packaging</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="canceled">Canceled</option>
                    </select>
                    <button onClick={() => window.open(`tel:${o.userInfo?.phone}`)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary">Call Customer</button>
                  </div>
                </div>
              )) : (
                <p className="text-center py-40 opacity-20 font-black uppercase tracking-[0.4em]">No Orders Found</p>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8">
              <button 
                onClick={() => { setProductForm({ name: '', category: 'mobile', price: 0, description: '', image: '', stock: 'instock' }); setShowProductModal({} as Product); }} 
                className="w-full h-14 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
              >
                Add New Product
              </button>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {products.length > 0 ? products.map(p => (
                  <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm group">
                    <div className="aspect-square bg-slate-50 dark:bg-black/40 rounded-2xl p-4 mb-4 relative overflow-hidden">
                      <img src={p.image} className="w-full h-full object-contain group-hover:scale-110 transition-all" alt={p.name} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => { setProductForm(p); setShowProductModal(p); }} className="w-10 h-10 bg-white rounded-xl text-slate-900 flex items-center justify-center"><i className="fas fa-edit"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 bg-red-500 rounded-xl text-white flex items-center justify-center"><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                    <h4 className="font-bold text-[10px] uppercase truncate mb-2">{p.name}</h4>
                    <p className="text-primary font-black text-xs">৳{p.price?.toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="col-span-full text-center py-40 opacity-20 font-black uppercase tracking-[0.4em]">No Products Available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map(u => (
                <div key={u.uid} className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 flex flex-col gap-8 shadow-sm">
                   <div className="flex items-center gap-4">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e11d48&color=fff&bold=true`} className="w-16 h-16 rounded-[22px]" alt="" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs uppercase truncate">{u.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Seller Rank</label>
                        <select 
                          value={u.rankOverride || 'bronze'} 
                          onChange={(e) => updateRank(u.uid, e.target.value as SellerRank)}
                          className="w-full h-11 bg-slate-50 dark:bg-black/20 rounded-xl px-4 text-[10px] font-black uppercase outline-none"
                        >
                          <option value="bronze">Bronze</option>
                          <option value="silver">Silver</option>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                          <option value="diamond">Diamond</option>
                          <option value="hero">Hero</option>
                          <option value="grand">Grand Master</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => setPersonalMsgUser(u)} className="flex-1 h-11 bg-slate-900 text-white dark:bg-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest">Message</button>
                         <button onClick={() => toggleBan(u)} className={`flex-1 h-11 rounded-xl text-[9px] font-black uppercase tracking-widest ${u.isBanned ? 'bg-success text-white' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                           {u.isBanned ? 'Unban' : 'Ban User'}
                         </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {sellRequests.length > 0 ? sellRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-bold text-xs uppercase">{req.deviceName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">User: {req.userName} | Asking: ৳{req.expectedPrice?.toLocaleString()}</p>
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{req.details}"
                    </div>
                  </div>
                  <select 
                    value={req.status} 
                    onChange={(e) => handleStatusChange(req.id, 'sell_requests', e.target.value)}
                    className="w-full md:w-48 h-12 bg-slate-50 dark:bg-black/40 rounded-xl px-5 text-[10px] font-black uppercase outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              )) : (
                <p className="text-center py-40 opacity-20 font-black uppercase tracking-[0.4em]">No Requests Found</p>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-xl space-y-10">
                 <div className="space-y-6">
                   <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-primary">SEO & Branding</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="col-span-full">
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Site Title</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.metaTitle} onChange={e => setSiteConfig({...siteConfig, metaTitle: e.target.value})} />
                     </div>
                     <div className="col-span-full">
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Meta Description</label>
                       <textarea className="w-full h-32 bg-slate-50 dark:bg-black/20 p-6 rounded-2xl font-medium outline-none border border-transparent focus:border-primary" value={siteConfig.metaDescription} onChange={e => setSiteConfig({...siteConfig, metaDescription: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">OG Image URL</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.ogImage} onChange={e => setSiteConfig({...siteConfig, ogImage: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Keywords</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.keywords} onChange={e => setSiteConfig({...siteConfig, keywords: e.target.value})} />
                     </div>
                   </div>
                 </div>

                 <div className="space-y-6">
                   <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-primary">OneSignal Settings</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">OneSignal App ID</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.oneSignalAppId} onChange={e => setSiteConfig({...siteConfig, oneSignalAppId: e.target.value})} />
                     </div>
                     <div>
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">OneSignal Rest Key</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.oneSignalRestKey} onChange={e => setSiteConfig({...siteConfig, oneSignalRestKey: e.target.value})} />
                     </div>
                   </div>
                 </div>

                 <div className="space-y-6">
                   <h4 className="font-black text-[11px] uppercase tracking-[0.4em] text-primary">Announcement Banner</h4>
                   <div className="flex gap-4 items-center">
                     <button 
                       onClick={() => setSiteConfig({...siteConfig, bannerVisible: !siteConfig.bannerVisible})}
                       className={`w-16 h-8 rounded-full transition-all relative ${siteConfig.bannerVisible ? 'bg-primary' : 'bg-slate-200'}`}
                     >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${siteConfig.bannerVisible ? 'left-9' : 'left-1'}`}></div>
                     </button>
                     <span className="text-[10px] font-black uppercase text-slate-400">Enable Banner</span>
                   </div>
                   {siteConfig.bannerVisible && (
                     <div className="animate-fade-in">
                       <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Banner Text</label>
                       <input className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.bannerText} onChange={e => setSiteConfig({...siteConfig, bannerText: e.target.value})} />
                     </div>
                   )}
                 </div>

                 <button onClick={async () => { await setDoc(doc(db, 'site_config', 'global'), siteConfig); notify('Settings Updated', 'success'); }} className="w-full h-18 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[22px] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95">
                   Save Global Settings
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'push' && (
            <form onSubmit={sendGlobalPush} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 space-y-8 max-w-2xl mx-auto shadow-2xl">
               <div className="text-center mb-10">
                 <div className="w-20 h-20 bg-primary/10 text-primary rounded-[30px] flex items-center justify-center text-3xl mx-auto mb-6"><i className="fas fa-bullhorn"></i></div>
                 <h3 className="text-2xl font-black uppercase tracking-tight">Push Notification</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Send message to all users</p>
               </div>
               <div className="space-y-4">
                 <input className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary" placeholder="Title" value={pushForm.title} onChange={e => setPushForm({...pushForm, title: e.target.value})} />
                 <textarea className="w-full p-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-medium text-sm h-36 border border-transparent focus:border-primary" placeholder="Message content..." value={pushForm.message} onChange={e => setPushForm({...pushForm, message: e.target.value})} />
                 <input className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary" placeholder="Image URL (Optional)" value={pushForm.image} onChange={e => setPushForm({...pushForm, image: e.target.value})} />
               </div>
               <button type="submit" disabled={sendingPush} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
                 {sendingPush ? <i className="fas fa-spinner animate-spin"></i> : 'Send Notification'}
               </button>
            </form>
          )}

          {activeTab === 'promotes' && (
            <div className="space-y-4">
              {promoteRequests.length > 0 ? promoteRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                  <div className="flex-1">
                    <h4 className="font-bold text-xs uppercase text-primary">{req.productName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">User: {req.userName} | Plan: {req.plan} | Status: {req.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'promote_requests', req.id), { status: 'approved' });
                            await updateDoc(doc(db, 'products', req.productId), { isPromoted: true });
                            notify('Promotion Approved!', 'success');
                            fetchData();
                          }}
                          className="px-6 h-11 bg-success text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >Approve</button>
                        <button 
                          onClick={() => handleStatusChange(req.id, 'promote_requests', 'rejected')}
                          className="px-6 h-11 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                        >Reject</button>
                      </>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-center py-40 opacity-20 font-black uppercase tracking-[0.4em]">No Promote Requests</p>
              )}
            </div>
          )}

        </div>
      )}

      {/* Message Modal */}
      {personalMsgUser && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={sendPersonalMessage} className="w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl space-y-8">
            <h3 className="text-xl font-black uppercase text-center">Message to {personalMsgUser.name}</h3>
            <div className="space-y-4">
              <input required className="w-full h-14 bg-slate-50 dark:bg-black/20 px-6 rounded-2xl outline-none font-bold border border-transparent focus:border-primary" placeholder="Subject" value={personalMsgContent.title} onChange={e => setPersonalMsgContent({...personalMsgContent, title: e.target.value})} />
              <textarea required className="w-full p-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none h-32 font-medium border border-transparent focus:border-primary" placeholder="Message body..." value={personalMsgContent.message} onChange={e => setPersonalMsgContent({...personalMsgContent, message: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setPersonalMsgUser(null)} className="flex-1 h-14 border border-slate-200 dark:border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">Send</button>
            </div>
          </form>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={handleProductSubmit} className="w-full max-w-2xl bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-slate-100 dark:border-white/10 space-y-6 overflow-y-auto max-h-[90vh] no-scrollbar">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Product Manager</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Product Name</label>
                <input required className="w-full h-12 bg-slate-50 dark:bg-black/20 px-4 rounded-xl font-bold outline-none" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="iPhone 15 Pro Max" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Category</label>
                <select className="w-full h-12 bg-slate-50 dark:bg-black/20 px-4 rounded-xl font-black uppercase text-[10px] outline-none" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value as any})}>
                  <option value="mobile">Mobiles</option>
                  <option value="laptop">Laptops</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Price (৳)</label>
                <input required type="number" className="w-full h-12 bg-slate-50 dark:bg-black/20 px-4 rounded-xl font-black text-primary outline-none" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Availability</label>
                <select className="w-full h-12 bg-slate-50 dark:bg-black/20 px-4 rounded-xl font-black uppercase text-[10px] outline-none" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})}>
                  <option value="instock">In Stock</option>
                  <option value="outofstock">Out of Stock</option>
                </select>
              </div>
              <div className="col-span-full">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Product Image URL</label>
                <input required className="w-full h-12 bg-slate-50 dark:bg-black/20 px-4 rounded-xl font-bold outline-none" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} placeholder="https://..." />
              </div>
              <div className="col-span-full">
                <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Description</label>
                <textarea className="w-full p-4 bg-slate-50 dark:bg-black/20 rounded-xl font-medium text-xs h-32 outline-none" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button type="button" onClick={() => setShowProductModal(null)} className="flex-1 h-14 border border-slate-100 dark:border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button type="submit" className="flex-[2] h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Save Product</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;
