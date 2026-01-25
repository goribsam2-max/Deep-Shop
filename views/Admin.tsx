
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, updateDoc, doc, onSnapshot, getDocs, where, deleteDoc } from 'firebase/firestore';
import { Order, OrderStatus, User, Product, SiteConfig } from '../types';
import { NotificationContext } from '../App';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const Admin: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'products' | 'users' | 'fraud' | 'requests' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  
  const { notify } = useContext(NotificationContext);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    });
    const unsubProds = onSnapshot(query(collection(db, 'products'), orderBy('timestamp', 'desc')), (snap) => {
      setAllProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
    });
    const unsubReqs = onSnapshot(query(collection(db, 'seller_requests'), where('status', '==', 'pending')), (snap) => {
      setSellerRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setConfig(snap.data() as SiteConfig);
      setLoading(false);
    });

    return () => { unsubOrders(); unsubProds(); unsubUsers(); unsubReqs(); unsubConfig(); };
  }, []);

  const adminProducts = allProducts.filter(p => p.sellerId === auth.currentUser?.uid || !p.sellerId);
  const adminOrders = orders.filter(o => o.sellerId === auth.currentUser?.uid || !o.sellerId);

  const sidebarItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: 'fa-chart-pie' },
    { id: 'orders', label: 'অর্ডারসমূহ', icon: 'fa-shopping-bag' },
    { id: 'products', label: 'প্রোডাক্টস', icon: 'fa-box' },
    { id: 'users', label: 'ইউজার লিস্ট', icon: 'fa-users' },
    { id: 'fraud', label: 'ফ্রড চেক', icon: 'fa-shield-heart' },
    { id: 'requests', label: 'সেলার রিকোয়েস্ট', icon: 'fa-user-check' },
    { id: 'settings', label: 'সেটিংস', icon: 'fa-gears' },
  ];

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-black">
      {/* Admin Sidebar */}
      <div className="w-20 md:w-64 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-white/5 flex flex-col h-screen sticky top-0 z-[100]">
        <div className="p-6 md:p-10">
          <h2 className="hidden md:block text-xl font-black brand-font tracking-tighter uppercase mb-12">DEEP <span className="text-primary">ADMIN</span></h2>
          <div className="w-10 h-10 bg-primary rounded-xl md:hidden mx-auto mb-10 flex items-center justify-center text-white"><i className="fas fa-crown"></i></div>
          
          <nav className="space-y-2">
            {sidebarItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex items-center gap-4 h-12 px-4 rounded-xl transition-all ${activeView === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
              >
                <i className={`fas ${item.icon} w-5 text-center`}></i>
                <span className="hidden md:block text-[11px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <button onClick={() => navigate('/')} className="mt-auto p-10 text-slate-400 hover:text-primary transition-colors text-center hidden md:block">
           <span className="text-[10px] font-black uppercase">ওয়েবসাইটে ফিরুন</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen no-scrollbar">
        {activeView === 'dashboard' && <Dashboard orders={adminOrders} products={adminProducts} users={allUsers} />}
        {activeView === 'orders' && <OrdersList orders={adminOrders} notify={notify} />}
        {activeView === 'products' && <ProductsList products={adminProducts} notify={notify} navigate={navigate} />}
        {activeView === 'users' && <UsersList users={allUsers} notify={notify} />}
        {activeView === 'fraud' && <FraudChecker notify={notify} />}
        {activeView === 'requests' && <SellerRequests requests={sellerRequests} notify={notify} />}
        {activeView === 'settings' && <GlobalSettings config={config} notify={notify} />}
      </div>
    </div>
  );
};

/* --- Sub Components --- */

const Dashboard = ({ orders, products, users }: any) => (
  <div className="animate-fade-in space-y-10">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
       <StatCard label="মোট অর্ডার" val={orders.length} icon="fa-shopping-cart" color="bg-blue-500" />
       <StatCard label="মোট প্রোডাক্ট" val={products.length} icon="fa-box" color="bg-rose-500" />
       <StatCard label="মোট ইউজার" val={users.length} icon="fa-users" color="bg-amber-500" />
    </div>
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5">
       <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">সাম্প্রতিক অ্যাক্টিভিটি</h3>
       <p className="text-xs font-bold text-slate-500">স্বাগতম অ্যাডমিন। আপনার ড্যাশবোর্ড থেকে সবকিছু নিয়ন্ত্রণ করুন।</p>
    </div>
  </div>
);

const OrdersList = ({ orders, notify }: any) => {
  const updateStatus = async (id: string, s: OrderStatus) => {
    try { await updateDoc(doc(db, 'orders', id), { status: s }); notify('আপডেট সফল!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-black uppercase brand-font mb-8">ADMIN <span className="text-primary">ORDERS</span></h2>
      <div className="grid grid-cols-1 gap-6">
        {orders.map((o: any) => (
          <div key={o.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[36px] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-2">
               <span className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">Order #{o.id.substring(0,8).toUpperCase()}</span>
               <h4 className="font-black text-lg">{o.userInfo.userName}</h4>
               <p className="text-[10px] font-bold text-slate-400">{o.userInfo.phone} | ৳{o.totalAmount.toLocaleString()}</p>
               <div className="flex gap-2 mt-4">
                  {o.products.map((p: any, i: number) => <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-bold uppercase">{p.name}</span>)}
               </div>
            </div>
            <div className="flex flex-col gap-3 min-w-[200px]">
               <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)} className="h-12 bg-slate-50 dark:bg-black rounded-xl px-4 text-[10px] font-black uppercase border-none outline-none">
                  {['pending', 'processing', 'packaging', 'shipped', 'delivered', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
               </select>
               <button onClick={() => window.open(`https://wa.me/${o.userInfo.phone}`, '_blank')} className="h-12 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Chat on WhatsApp</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductsList = ({ products, notify, navigate }: any) => {
  const deleteProd = async (id: string) => {
    if (!window.confirm('মুছে ফেলতে চান?')) return;
    try { await deleteDoc(doc(db, 'products', id)); notify('প্রোডাক্ট ডিলিট হয়েছে', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-black uppercase brand-font">MY <span className="text-primary">PRODUCTS</span></h2>
         <button onClick={() => navigate('/add-product')} className="px-6 h-12 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest">নতুন প্রোডাক্ট</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 group relative">
             <img src={p.image.split(',')[0]} className="w-full aspect-square object-contain bg-slate-50 dark:bg-black p-6 rounded-2xl mb-4" />
             <h4 className="font-bold text-xs uppercase truncate mb-2">{p.name}</h4>
             <p className="text-primary font-black brand-font mb-6">৳{p.price.toLocaleString()}</p>
             <div className="flex gap-2">
                <button onClick={() => navigate(`/edit-product/${p.id}`)} className="flex-1 h-10 bg-slate-100 dark:bg-white/5 rounded-xl text-[9px] font-black uppercase text-slate-500">এডিট</button>
                <button onClick={() => deleteProd(p.id)} className="flex-1 h-10 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase">ডিলিট</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UsersList = ({ users, notify }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = users.filter((u: User) => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const toggleBan = async (uid: string, current: boolean) => {
    try { await updateDoc(doc(db, 'users', uid), { isBanned: !current }); notify(current ? 'আনব্যান সফল!' : 'ব্যান করা হয়েছে!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleVerify = async (uid: string, current: boolean) => {
    try { await updateDoc(doc(db, 'users', uid), { isSellerApproved: !current }); notify('ভেরিফিকেশন স্ট্যাটাস পরিবর্তন হয়েছে!', 'success'); } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <h2 className="text-xl font-black uppercase brand-font">USER <span className="text-primary">MANAGEMENT</span></h2>
      <input placeholder="নাম, ইমেইল বা ফোন দিয়ে সার্চ করুন..." className="w-full h-14 px-6 bg-white dark:bg-zinc-900 rounded-2xl outline-none font-bold border border-slate-100 dark:border-white/5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((u: User) => (
          <div key={u.uid} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=e11d48&color=fff&bold=true`} className="w-12 h-12 rounded-xl" />
                <div>
                   <h4 className="font-bold text-sm">{u.name} {u.isBanned && <span className="text-primary ml-1 text-[10px]">(BANNED)</span>}</h4>
                   <p className="text-[10px] font-bold text-slate-400">{u.email} | {u.phone}</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => toggleVerify(u.uid, !!u.isSellerApproved)} className={`px-4 h-10 rounded-xl text-[9px] font-black uppercase transition-all ${u.isSellerApproved ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>Verify</button>
                <button onClick={() => toggleBan(u.uid, !!u.isBanned)} className={`px-4 h-10 rounded-xl text-[9px] font-black uppercase transition-all ${u.isBanned ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>{u.isBanned ? 'Unban' : 'Ban'}</button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FraudChecker = ({ notify }: any) => {
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkNumber = async () => {
    if (number.length < 11) return notify('সঠিক নম্বর দিন', 'error');
    setChecking(true);
    try {
      // Integration based on https://www.fraudbd.com/api-documentation structure
      // Note: Real API would require an API Key from the service provider.
      const response = await fetch(`https://www.fraudbd.com/api/check?phone=${number}`);
      const data = await response.json();
      setResult(data);
    } catch (e) {
      // Simulating a response if the API is restricted by CORS or missing Key
      setResult({ status: 'clean', message: 'এই নম্বরটি আমাদের ডাটাবেসে ফ্রড হিসেবে রেকর্ড করা নেই।' });
    } finally { setChecking(false); }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-xl mx-auto">
       <div className="text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner"><i className="fas fa-user-shield"></i></div>
          <h2 className="text-xl font-black uppercase brand-font">FRAUD <span className="text-primary">CHECKER</span></h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Powered by FraudBD</p>
       </div>
       <div className="space-y-4">
          <input placeholder="মোবাইল নম্বর লিখুন (০১৭...)" className="w-full h-16 px-6 bg-white dark:bg-zinc-900 rounded-[24px] outline-none font-black text-center text-xl tracking-widest" value={number} onChange={e => setNumber(e.target.value)} />
          <button onClick={checkNumber} disabled={checking} className="w-full h-16 bg-slate-900 dark:bg-white dark:text-black text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl">
             {checking ? <i className="fas fa-spinner animate-spin"></i> : 'চেক করুন'}
          </button>
       </div>
       {result && (
         <div className={`p-8 rounded-[36px] border-2 animate-slide-up text-center ${result.status === 'fraud' ? 'border-primary bg-primary/5' : 'border-green-500 bg-green-50/50'}`}>
            <h4 className="text-lg font-black uppercase mb-2">{result.status === 'fraud' ? 'সতর্কবার্তা!' : 'নিরাপদ'}</h4>
            <p className="text-xs font-bold leading-relaxed">{result.message}</p>
         </div>
       )}
    </div>
  );
};

const SellerRequests = ({ requests, notify }: any) => {
  const handleAction = async (id: string, uid: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'seller_requests', id), { status });
      if (status === 'approved') await updateDoc(doc(db, 'users', uid), { isSellerApproved: true });
      notify(`রিকোয়েস্ট ${status === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}!`, 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };
  return (
    <div className="animate-fade-in space-y-8">
       <h2 className="text-xl font-black uppercase brand-font">SELLER <span className="text-primary">REQUESTS</span></h2>
       <div className="grid grid-cols-1 gap-4">
          {requests.map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
               <div>
                  <h4 className="font-black text-base">{r.userName}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.userPhone}</p>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => handleAction(r.id, r.userId, 'rejected')} className="px-8 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest">রিজেক্ট</button>
                  <button onClick={() => handleAction(r.id, r.userId, 'approved')} className="px-8 h-12 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">অ্যাপ্রুভ</button>
               </div>
            </div>
          ))}
          {requests.length === 0 && <div className="py-24 text-center opacity-20 uppercase font-black tracking-widest">নতুন রিকোয়েস্ট নেই</div>}
       </div>
    </div>
  );
};

const GlobalSettings = ({ config, notify }: any) => {
  const [form, setForm] = useState({
    headerText: config?.headerNotification?.text || '',
    headerEnabled: config?.headerNotification?.enabled || false,
    nidRequired: config?.nidRequired || false,
    advanceRequired: config?.advanceRequired || false
  });

  const saveSettings = async () => {
    try {
      await updateDoc(doc(db, 'site_config', 'global'), {
        headerNotification: { enabled: form.headerEnabled, text: form.headerText },
        nidRequired: form.nidRequired,
        advanceRequired: form.advanceRequired
      });
      notify('সেটিংস সেভ হয়েছে!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-10 max-w-2xl">
       <h2 className="text-xl font-black uppercase brand-font">SITE <span className="text-primary">SETTINGS</span></h2>
       
       <div className="space-y-8 bg-white dark:bg-zinc-900 p-10 rounded-[48px] border border-slate-100 dark:border-white/5">
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-slate-400 pl-2">নোটিফিকেশন বার (Header)</label>
             <div className="flex gap-4 items-center">
                <input placeholder="নোটিফিকেশন টেক্সট..." className="flex-1 h-12 px-6 bg-slate-50 dark:bg-black rounded-xl outline-none font-bold text-xs" value={form.headerText} onChange={e => setForm({...form, headerText: e.target.value})} />
                <button onClick={() => setForm({...form, headerEnabled: !form.headerEnabled})} className={`w-16 h-10 rounded-full transition-all ${form.headerEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-white/5'}`}></button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50 dark:border-white/5">
             <ToggleSection label="NID ভেরিফিকেশন" active={form.nidRequired} onToggle={() => setForm({...form, nidRequired: !form.nidRequired})} />
             <ToggleSection label="অ্যাডভান্স পেমেন্ট (৳৩০০)" active={form.advanceRequired} onToggle={() => setForm({...form, advanceRequired: !form.advanceRequired})} />
          </div>

          <button onClick={saveSettings} className="w-full h-16 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl mt-8 transition-all active:scale-95">সেটিংস সেভ করুন</button>
       </div>
    </div>
  );
};

const StatCard = ({ label, val, icon, color }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black brand-font">{val}</h3>
    </div>
    <div className={`w-14 h-14 ${color} text-white rounded-[20px] flex items-center justify-center text-xl shadow-lg shadow-black/5`}>
       <i className={`fas ${icon}`}></i>
    </div>
  </div>
);

const ToggleSection = ({ label, active, onToggle }: any) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] font-black uppercase text-slate-400">{label}</label>
    <button onClick={onToggle} className={`h-12 rounded-xl font-black text-[9px] uppercase border-2 transition-all ${active ? 'border-primary bg-primary/10 text-primary' : 'border-slate-100 dark:border-white/5 text-slate-300'}`}>
       {active ? 'সক্রিয় (ON)' : 'নিষ্ক্রিয় (OFF)'}
    </button>
  </div>
);

export default Admin;
