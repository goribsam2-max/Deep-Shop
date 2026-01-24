
import React, { useState, useEffect, useContext } from 'react';
import { db, auth } from '../services/firebase';
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { NotificationContext } from '../App';
import { User, Product } from '../types';
import Loader from '../components/Loader';
import { sendTelegramNotification } from '../services/telegram';
import { PRODUCT_CATEGORIES } from '../constants';

const AddProduct: React.FC = () => {
  const { productId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  const [form, setForm] = useState({
    name: '',
    image: '',
    price: '',
    description: '',
    category: '',
    paymentMethod: 'bkash',
    paymentNumber: '',
    whatsapp: '',
    stock: 'instock'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!auth.currentUser) { navigate('/auth'); return; }
      const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (uSnap.exists()) setUser({ uid: uSnap.id, ...uSnap.data() } as User);

      if (productId) {
        const pSnap = await getDoc(doc(db, 'products', productId));
        if (pSnap.exists()) {
          const pData = pSnap.data() as Product;
          // Check if admin or the actual owner
          if (auth.currentUser.uid === pData.sellerId || (uSnap.exists() && uSnap.data().isAdmin)) {
            setForm({
              name: pData.name,
              image: pData.image,
              price: String(pData.price),
              description: pData.description,
              category: pData.category,
              paymentMethod: (pData.sellerPaymentMethod as any) || 'bkash',
              paymentNumber: pData.sellerPaymentNumber || '',
              whatsapp: pData.sellerWhatsapp || '',
              stock: pData.stock || 'instock'
            });
          } else {
            notify('আপনার এই প্রোডাক্টটি এডিট করার অনুমতি নেই।', 'error');
            navigate('/profile');
          }
        }
      }
      setLoading(false);
    };
    fetchInitialData();
  }, [navigate, productId]);

  const handleVerificationRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'seller_requests'), {
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      
      const tgMsg = `🔔 <b>নতুন সেলার অনুরোধ!</b>\n\n👤 <b>নাম:</b> ${user.name}\n📞 <b>ফোন:</b> ${user.phone}\n📧 <b>ইমেইল:</b> ${user.email}\n\nদয়া করে অ্যাডমিন প্যানেল চেক করুন।`;
      await sendTelegramNotification(tgMsg);

      notify('অনুরোধ পাঠানো হয়েছে!', 'success');
      const waMsg = `DEEP SHOP ভেরিফিকেশন অনুরোধ:\nনাম: ${user.name}\nফোন: ${user.phone}\nআমি সেলার হিসেবে ভেরিফাই হতে চাই। আমার এনআইডি পাঠাচ্ছি।`;
      window.open(`https://wa.me/8801778953114?text=${encodeURIComponent(waMsg)}`, '_blank');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isSellerApproved && !user?.isAdmin) return notify('আপনার প্রোডাক্ট পাবলিশ করার অনুমতি নেই।', 'error');
    if (!form.name || !form.image || !form.price || !form.category || !form.whatsapp) return notify('সব তথ্য সঠিকভাবে দিন।', 'error');
    
    setSubmitting(true);
    try {
      const payload: any = {
        name: form.name,
        image: form.image,
        price: Number(form.price),
        description: form.description,
        category: form.category,
        sellerWhatsapp: form.whatsapp,
        sellerPaymentMethod: form.paymentMethod,
        sellerPaymentNumber: form.paymentNumber || user?.phone,
        stock: form.stock,
      };

      if (productId) {
        await updateDoc(doc(db, 'products', productId), payload);
        notify('প্রোডাক্ট সফলভাবে আপডেট হয়েছে!', 'success');
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          sellerId: user?.uid,
          sellerName: user?.name,
          sellerPhone: user?.phone,
          timestamp: serverTimestamp(),
          views: 0
        });
        notify('প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!', 'success');
      }
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Loader fullScreen />;

  if (!user?.isSellerApproved && !user?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-12 py-40 text-center animate-fade-in">
        <div className="w-24 h-24 bg-primary text-white rounded-[40px] flex items-center justify-center text-4xl mx-auto mb-10 shadow-2xl shadow-primary/20 animate-bounce">
          <i className="fas fa-id-card"></i>
        </div>
        <h2 className="text-3xl font-black uppercase mb-6 tracking-tighter brand-font">SELLER <span className="text-primary">VERIFICATION</span></h2>
        <p className="text-slate-500 mb-12 font-bold text-sm leading-relaxed px-10">
          প্রোডাক্ট বিক্রি করতে হলে আপনাকে আপনার এনআইডি কার্ড দিয়ে ভেরিফাই হতে হবে। নিচের বাটনে ক্লিক করে অ্যাডমিনকে আপনার তথ্য পাঠান।
        </p>
        <button onClick={handleVerificationRequest} disabled={submitting} className="w-full h-16 bg-green-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all">
          <i className="fab fa-whatsapp text-lg"></i> অ্যাডমিনকে মেসেজ দিন
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 pb-40 animate-fade-in">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-3xl font-black uppercase mb-2 brand-font italic text-slate-900 dark:text-white">
          DEEP <span className="text-primary">{productId ? 'UPDATE' : 'PUBLISH'}</span>
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          {productId ? 'প্রোডাক্টের তথ্য আপডেট করুন' : 'আপনার প্রোডাক্টের সব তথ্য দিন'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[48px] border border-slate-100 dark:border-white/5 space-y-10 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">প্রোডাক্টের নাম</label>
              <input required placeholder="মডেল ও নাম দিন" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/30 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ছবির লিংক</label>
              <input required placeholder="https://..." className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/30 transition-all" value={form.image} onChange={e => setForm({...form, image: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">মূল্য (৳)</label>
                 <input required type="number" placeholder="৳" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl font-black text-primary outline-none border border-transparent focus:border-primary/30 transition-all" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ক্যাটাগরি</label>
                 <select required className="w-full h-14 px-4 bg-slate-50 dark:bg-black/40 rounded-2xl font-black uppercase text-[10px] outline-none border border-transparent focus:border-primary/30 transition-all appearance-none cursor-pointer" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">সিলেক্ট করুন</option>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">{cat}</option>
                    ))}
                 </select>
               </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">স্টক স্ট্যাটাস</label>
              <select required className="w-full h-14 px-4 bg-slate-50 dark:bg-black/40 rounded-2xl font-black uppercase text-[10px] outline-none border border-transparent focus:border-primary/30 transition-all cursor-pointer" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}>
                <option value="instock">স্টক আছে (In Stock)</option>
                <option value="outstock">স্টক নেই (Out of Stock)</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-2">মেথড</label>
                <select className="w-full h-14 px-4 bg-slate-50 dark:bg-black/40 rounded-2xl font-black text-[10px] outline-none border border-transparent focus:border-primary/30 transition-all cursor-pointer" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as any})}>
                  <option value="bkash">বিকাশ</option>
                  <option value="nagad">নগদ</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-2">পেমেন্ট নম্বর</label>
                <input required placeholder="নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/30 transition-all" value={form.paymentNumber} onChange={e => setForm({...form, paymentNumber: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">হোয়াটসঅ্যাপ নম্বর</label>
              <input required placeholder="যোগাযোগের নম্বর" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/30 transition-all" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">বিস্তারিত</label>
              <textarea required placeholder="প্রোডাক্ট সম্পর্কে লিখুন..." className="w-full p-6 bg-slate-50 dark:bg-black/40 rounded-2xl h-32 outline-none font-medium text-sm leading-relaxed border border-transparent focus:border-primary/30 transition-all" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
           <button 
             disabled={submitting} 
             className="w-full md:w-80 h-16 bg-gradient-to-r from-primary via-rose-500 to-primary bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-white rounded-full font-black uppercase text-[12px] tracking-[0.3em] shadow-[0_15px_30px_-5px_rgba(225,29,72,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
            {submitting ? (
              <span className="flex items-center justify-center gap-3">
                <i className="fas fa-spinner animate-spin"></i> প্রসেসিং হচ্ছে...
              </span>
            ) : (productId ? 'তথ্য আপডেট করুন' : 'প্রোডাক্ট পাবলিশ করুন')}
           </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
