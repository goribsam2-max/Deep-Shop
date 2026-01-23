
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { Order, Product, User, SiteConfig, SellerRequest, HomeBanner, CustomAd } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [ads, setAds] = useState<CustomAd[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ 
    bannerVisible: false, bannerText: '', bannerType: 'info',
    metaTitle: '', metaDescription: '', ogImage: '', keywords: '',
    contactPhone: '', telegramLink: '', whatsappLink: '',
    oneSignalAppId: '', oneSignalApiKey: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'requests' | 'settings' | 'banners' | 'ads'>('orders');
  const [userSearch, setUserSearch] = useState('');
  const { notify, enterShadowMode } = useContext(NotificationContext);

  // Form States
  const [showProductModal, setShowProductModal] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({ name: '', category: '', price: 0, description: '', image: '', stock: 'instock' });
  const [showAdModal, setShowAdModal] = useState<CustomAd | null>(null);
  const [adForm, setAdForm] = useState<Partial<CustomAd>>({ imageUrl: '', link: '', text: '', placement: 'home_middle', order: 0 });
  const [showBannerModal, setShowBannerModal] = useState<HomeBanner | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<HomeBanner>>({ imageUrl: '', link: '', order: 0 });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const pSnap = await getDocs(collection(db, 'products'));
        setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      }
      else if (activeTab === 'users') {
        const uSnap = await getDocs(collection(db, 'users'));
        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      }
      else if (activeTab === 'banners') {
        const bSnap = await getDocs(collection(db, 'banners'));
        const bannersData = bSnap.docs.map(d => ({ id: d.id, ...d.data() } as HomeBanner));
        setBanners(bannersData.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
      else if (activeTab === 'ads') {
        const aSnap = await getDocs(collection(db, 'ads'));
        const adsData = aSnap.docs.map(d => ({ id: d.id, ...d.data() } as CustomAd));
        setAds(adsData.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
      else if (activeTab === 'requests') {
        const rSnap = await getDocs(query(collection(db, 'seller_requests'), orderBy('timestamp', 'desc')));
        setSellerRequests(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as SellerRequest)));
      }
      else if (activeTab === 'orders') {
        const oSnap = await getDocs(query(collection(db, 'orders'), orderBy('timestamp', 'desc')));
        const allOrders = oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        setOrders(allOrders.filter(o => !o.sellerId || o.sellerId === auth.currentUser?.uid));
      }
      else if (activeTab === 'settings') {
        const sSnap = await getDocs(collection(db, 'site_config'));
        const globalConfig = sSnap.docs.find(d => d.id === 'global');
        if (globalConfig) setSiteConfig(globalConfig.data() as SiteConfig);
      }
    } catch (err: any) { 
      console.error("Admin Fetch Error:", err);
      notify(`Sync Failed: Check Permissions.`, 'error'); 
    } finally { setLoading(false); }
  };

  const handleUpdateConfig = async () => {
    try {
      await updateDoc(doc(db, 'site_config', 'global'), siteConfig as any);
      notify('গ্লোবাল সেটিংস আপডেট করা হয়েছে!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showBannerModal?.id) {
        await updateDoc(doc(db, 'banners', showBannerModal.id), bannerForm);
        notify('ব্যানার আপডেট করা হয়েছে!', 'success');
      } else {
        await addDoc(collection(db, 'banners'), bannerForm);
        notify('নতুন ব্যানার যুক্ত করা হয়েছে!', 'success');
      }
      setShowBannerModal(null);
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showAdModal?.id) {
        await updateDoc(doc(db, 'ads', showAdModal.id), adForm);
        notify('বিজ্ঞাপন আপডেট করা হয়েছে!', 'success');
      } else {
        await addDoc(collection(db, 'ads'), adForm);
        notify('নতুন বিজ্ঞাপন যুক্ত করা হয়েছে!', 'success');
      }
      setShowAdModal(null);
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const deleteItem = async (id: string, coll: string) => {
    if (!confirm('আপনি কি এটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      notify('সফলভাবে মুছে ফেলা হয়েছে।', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (showProductModal?.id) {
        await updateDoc(doc(db, 'products', showProductModal.id), productForm);
      } else {
        await addDoc(collection(db, 'products'), { ...productForm, timestamp: serverTimestamp(), views: 0 });
      }
      notify('প্রোডাক্ট সফলভাবে সিনক্রোনাইজ হয়েছে।', 'success');
      setShowProductModal(null);
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const approveSeller = async (req: SellerRequest) => {
    try {
      await updateDoc(doc(db, 'users', req.userId), { isSellerApproved: true });
      await updateDoc(doc(db, 'seller_requests', req.id), { status: 'approved' });
      notify('সেলার অনুমতি দেওয়া হয়েছে!', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const rejectSeller = async (req: SellerRequest) => {
    try {
      await updateDoc(doc(db, 'seller_requests', req.id), { status: 'rejected' });
      notify('সেলার অনুরোধ বাতিল করা হয়েছে।', 'info');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen pb-40 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight brand-font">DEEP <span className="text-primary">ADMIN</span></h1>
          <p className="text-[11px] font-bold text-slate-400 mt-1">অফিসিয়াল কন্ট্রোল প্যানেল</p>
        </div>
        <div className="flex flex-wrap p-1.5 bg-slate-100 dark:bg-white/5 rounded-3xl gap-1 overflow-x-auto no-scrollbar">
          {['orders', 'products', 'banners', 'ads', 'users', 'requests', 'settings'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`px-5 h-11 rounded-2xl font-bold text-[11px] transition-all ${activeTab === tab ? 'bg-primary text-white shadow-xl' : 'text-slate-500 hover:bg-white dark:hover:bg-white/10'}`}
            >
              {tab === 'orders' ? 'অর্ডার' : tab === 'products' ? 'পণ্য' : tab === 'banners' ? 'ব্যানার' : tab === 'ads' ? 'বিজ্ঞাপন' : tab === 'users' ? 'ইউজার' : tab === 'requests' ? 'অনুরোধ' : 'সেটিংস'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in">
          {activeTab === 'orders' && (
            <div className="space-y-4">
               <h2 className="text-xl font-bold mb-6">অর্ডার তালিকা</h2>
               {orders.map(o => (
                 <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col gap-6 shadow-sm">
                    <div className="flex justify-between items-start">
                       <div>
                          <span className="text-[10px] font-bold text-primary uppercase">আইডি #{o.id?.substring(0,8).toUpperCase()}</span>
                          <h4 className="font-bold text-sm mt-1">{o.userInfo?.userName || 'অজানা ইউজার'}</h4>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-bold">৳{o.totalAmount?.toLocaleString()}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{o.status}</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       {o.products?.map((p, i) => <p key={i} className="text-[11px] font-bold text-slate-500 uppercase">{p.name} x{p.quantity}</p>)}
                    </div>
                    <select value={o.status || 'pending'} onChange={async (e) => { await updateDoc(doc(db, 'orders', o.id), { status: e.target.value }); fetchData(); }} className="w-full h-12 bg-slate-50 dark:bg-black rounded-xl px-5 text-[11px] font-bold outline-none border border-slate-200 dark:border-white/5">
                      {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
               ))}
               {orders.length === 0 && <div className="text-center py-20 opacity-20 font-bold uppercase">কোন অর্ডার পাওয়া যায়নি</div>}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8">
               <button onClick={() => { setProductForm({ name: '', category: '', price: 0, description: '', image: '', stock: 'instock' }); setShowProductModal({} as Product); }} className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl">নতুন প্রোডাক্ট যোগ করুন</button>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col group relative shadow-sm">
                       <div className="aspect-square bg-slate-50 dark:bg-black/20 rounded-2xl p-4 mb-4">
                          <img src={p.image?.split(',')[0]} className="w-full h-full object-contain" />
                       </div>
                       <h4 className="text-[11px] font-bold truncate">{p.name}</h4>
                       <p className="text-primary font-bold text-sm">৳{p.price.toLocaleString()}</p>
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-3xl">
                          <button onClick={() => { setProductForm(p); setShowProductModal(p); }} className="w-10 h-10 bg-white rounded-xl text-slate-900"><i className="fas fa-edit"></i></button>
                          <button onClick={() => deleteItem(p.id, 'products')} className="w-10 h-10 bg-red-500 rounded-xl text-white"><i className="fas fa-trash"></i></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'banners' && (
            <div className="space-y-8">
               <button onClick={() => { setBannerForm({ imageUrl: '', link: '', order: 0 }); setShowBannerModal({} as any); }} className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl">স্লাইডার ব্যানার যোগ করুন</button>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {banners.map(b => (
                    <div key={b.id} className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-white/5 group relative shadow-md">
                       <img src={b.imageUrl} className="w-full h-44 object-cover" />
                       <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-black/20">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">সিরিয়াল: {b.order}</span>
                            <span className="text-[10px] font-bold text-primary truncate max-w-[200px]">{b.link || 'নো লিংক'}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => { setBannerForm(b); setShowBannerModal(b); }} className="text-slate-500 hover:text-primary"><i className="fas fa-edit"></i></button>
                             <button onClick={() => deleteItem(b.id, 'banners')} className="text-red-500"><i className="fas fa-trash"></i></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-8">
               <button onClick={() => { setAdForm({ imageUrl: '', link: '', text: '', placement: 'home_middle', order: 0 }); setShowAdModal({} as any); }} className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl">নতুন বিজ্ঞাপন যোগ করুন</button>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ads.map(ad => (
                    <div key={ad.id} className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm group">
                      <img src={ad.imageUrl} className="w-full h-32 object-cover" alt="" />
                      <div className="p-4 bg-slate-50 dark:bg-black/20">
                        <div className="flex justify-between items-start mb-2">
                           <p className="text-[10px] font-bold text-primary uppercase">{ad.placement}</p>
                           <div className="flex gap-2">
                             <button onClick={() => { setAdForm(ad); setShowAdModal(ad); }} className="text-slate-400 hover:text-primary"><i className="fas fa-edit text-xs"></i></button>
                             <button onClick={() => deleteItem(ad.id, 'ads')} className="text-red-500"><i className="fas fa-trash text-xs"></i></button>
                           </div>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 truncate">{ad.text}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8">
               <div className="relative">
                 <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                 <input 
                  placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..." 
                  className="w-full h-14 pl-14 pr-6 bg-white dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/10 font-bold outline-none" 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                 />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(u => (
                  <div key={u.uid} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex flex-col gap-6 shadow-sm">
                     <div className="flex items-center gap-4">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=e11d48&color=fff&bold=true`} className="w-14 h-14 rounded-2xl shadow-lg" alt="" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs uppercase truncate">{u.name || 'নাম নেই'}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        <button onClick={() => enterShadowMode(u.uid)} className="flex-1 h-11 bg-slate-900 text-white dark:bg-white dark:text-black rounded-xl text-[10px] font-bold uppercase transition-all">এক্সেস নিন</button>
                        <button onClick={async () => { await updateDoc(doc(db, 'users', u.uid), { isSellerApproved: !u.isSellerApproved }); fetchData(); }} className={`flex-1 h-11 rounded-xl text-[10px] font-bold uppercase transition-all ${u.isSellerApproved ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                          {u.isSellerApproved ? 'ভেরিফাইড' : 'ভেরিফাই'}
                        </button>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
               <h2 className="text-xl font-bold mb-6">সেলার অনুরোধসমূহ</h2>
               {sellerRequests.map(req => (
                 <div key={req.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 flex justify-between items-center shadow-sm">
                    <div>
                       <h4 className="font-bold text-sm">{req.userName}</h4>
                       <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">{req.userPhone}</p>
                       <span className="text-[10px] font-bold uppercase mt-2 inline-block px-3 py-1 bg-primary/10 text-primary rounded-full">{req.status} Request</span>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex gap-3">
                        <button onClick={() => approveSeller(req)} className="w-12 h-12 bg-green-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all"><i className="fas fa-check"></i></button>
                        <button onClick={() => rejectSeller(req)} className="w-12 h-12 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all"><i className="fas fa-times"></i></button>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-12 max-w-4xl mx-auto">
               <div className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] border border-slate-100 dark:border-white/5 space-y-8 shadow-sm">
                  <h2 className="text-xl font-bold text-primary">গ্লোবাল সেটিংস</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold uppercase text-slate-400 pl-2">ব্যানার টেক্সট</label>
                       <input className="w-full h-12 px-5 bg-slate-50 dark:bg-black rounded-xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.bannerText} onChange={e => setSiteConfig({...siteConfig, bannerText: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold uppercase text-slate-400 pl-2">সাপোর্ট হোয়াটসঅ্যাপ</label>
                       <input className="w-full h-12 px-5 bg-slate-50 dark:bg-black rounded-xl font-bold outline-none border border-transparent focus:border-primary" value={siteConfig.whatsappLink} onChange={e => setSiteConfig({...siteConfig, whatsappLink: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={handleUpdateConfig} className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95">আপডেট করুন</button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Banner Modal */}
      {showBannerModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={saveBanner} className="w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[40px] space-y-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center">ব্যানার সেটিংস</h2>
            <div className="space-y-4">
              <input required placeholder="ছবির লিংক (URL)" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} />
              <input placeholder="টার্গেট লিংক (ঐচ্ছিক)" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={bannerForm.link} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} />
              <input type="number" placeholder="অর্ডার সিরিয়াল (০, ১, ২...)" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={bannerForm.order} onChange={e => setBannerForm({...bannerForm, order: Number(e.target.value)})} />
            </div>
            <div className="flex gap-3 pt-4">
               <button type="button" onClick={() => setShowBannerModal(null)} className="flex-1 h-14 border rounded-2xl text-[12px] font-bold">বাতিল</button>
               <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl text-[12px] font-bold">সেভ করুন</button>
            </div>
          </form>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={saveAd} className="w-full max-w-md bg-white dark:bg-zinc-900 p-10 rounded-[40px] space-y-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-center">বিজ্ঞাপন সেটিংস</h2>
            <div className="space-y-4">
              <input required placeholder="ছবির লিংক" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={adForm.imageUrl} onChange={e => setAdForm({...adForm, imageUrl: e.target.value})} />
              <input placeholder="বিজ্ঞাপন টেক্সট" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={adForm.text} onChange={e => setAdForm({...adForm, text: e.target.value})} />
              <select className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={adForm.placement} onChange={e => setAdForm({...adForm, placement: e.target.value as any})}>
                <option value="home_top">Home Top</option>
                <option value="home_middle">Home Middle</option>
                <option value="home_bottom">Home Bottom</option>
              </select>
              <input type="number" placeholder="সিরিয়াল" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl outline-none font-bold" value={adForm.order} onChange={e => setAdForm({...adForm, order: Number(e.target.value)})} />
            </div>
            <div className="flex gap-3 pt-4">
               <button type="button" onClick={() => setShowAdModal(null)} className="flex-1 h-14 border rounded-2xl text-[12px] font-bold">বাতিল</button>
               <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl text-[12px] font-bold">সেভ করুন</button>
            </div>
          </form>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
          <form onSubmit={saveProduct} className="w-full max-w-2xl bg-white dark:bg-zinc-900 p-10 rounded-[40px] space-y-6 my-10 shadow-2xl">
            <h2 className="text-2xl font-black uppercase mb-8 brand-font">PRODUCT <span className="text-primary">SYNC</span></h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input required placeholder="নাম" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl font-bold outline-none" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
              <input required placeholder="ক্যাটাগরি" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl font-bold outline-none" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} />
              <input required type="number" placeholder="দাম" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl font-bold text-primary outline-none" value={productForm.price} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} />
              <input required placeholder="ছবির লিংক" className="w-full h-14 px-6 bg-slate-50 dark:bg-black rounded-2xl font-bold outline-none" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} />
              <textarea placeholder="বিস্তারিত" className="col-span-full w-full p-6 bg-slate-50 dark:bg-black rounded-2xl h-32 outline-none font-medium text-sm" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowProductModal(null)} className="flex-1 h-14 border rounded-2xl font-bold text-[12px]">বাতিল</button>
              <button type="submit" className="flex-[2] h-14 bg-primary text-white rounded-2xl font-bold text-[12px]">কনফার্ম করুন</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Admin;
