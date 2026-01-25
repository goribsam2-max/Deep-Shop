
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
    paymentEmail: '',
    whatsapp: '',
    stock: 'instock'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!auth.currentUser) { navigate('/auth'); return; }
      const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (uSnap.exists()) {
        const userData = { uid: uSnap.id, ...uSnap.data() } as User;
        setUser(userData);
        // Default payment email to user's email if creating new product
        if (!productId) {
          setForm(prev => ({ ...prev, paymentEmail: userData.email }));
        }
      }

      if (productId) {
        const pSnap = await getDoc(doc(db, 'products', productId));
        if (pSnap.exists()) {
          const pData = pSnap.data() as Product;
          if (auth.currentUser.uid === pData.sellerId || (uSnap.exists() && uSnap.data().isAdmin)) {
            setForm({
              name: pData.name,
              image: pData.image,
              price: String(pData.price),
              description: pData.description,
              category: pData.category,
              paymentEmail: pData.sellerPaymentEmail || '',
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
      const tgMsg = `🔔 <b>নতুন সেলার অনুরোধ!</b>\n\n👤 <b>নাম:</b> ${user.name}\n📞 <b>ফোন:</b> ${user.phone}\n📧 <b>ইমেইল:</b> ${user.email}`;
      await sendTelegramNotification(tgMsg);
      notify('অনুরোধ পাঠানো হয়েছে!', 'success');
      window.open(`https://wa.me/8801778953114?text=${encodeURIComponent("আমি সেলার হিসেবে ভেরিফাই হতে চাই।")}`, '_blank');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isSellerApproved && !user?.isAdmin) return notify('আপনার প্রোডাক্ট পাবলিশ করার অনুমতি নেই।', 'error');
    if (!form.name || !form.price || !form.category || !form.whatsapp) return notify('সব তথ্য সঠিকভাবে দিন।', 'error');
    
    setSubmitting(true);
    try {
      // Use user email as fallback if paymentEmail is empty
      const finalPaymentEmail = form.paymentEmail.trim() || user.email;

      const payload: any = {
        name: form.name,
        image: form.image,
        price: Number(form.price),
        description: form.description,
        category: form.category,
        sellerWhatsapp: form.whatsapp,
        sellerPaymentEmail: finalPaymentEmail,
        stock: form.stock,
      };

      if (productId) {
        await updateDoc(doc(db, 'products', productId), payload);
        notify('প্রোডাক্ট আপডেট সফল!', 'success');
      } else {
        await addDoc(collection(db, 'products'), {
          ...payload,
          sellerId: user?.uid,
          sellerName: user?.name,
          sellerPhone: user?.phone,
          timestamp: serverTimestamp(),
          views: 0
        });
        notify('প্রোডাক্ট পাবলিশ সফল!', 'success');
      }
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Loader fullScreen />;

  if (!user?.isSellerApproved && !user?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-12 py-40 text-center animate-fade-in">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center text-3xl mx-auto mb-8 shadow-inner">
          <i className="fas fa-id-card"></i>
        </div>
        <h2 className="text-2xl font-black uppercase mb-4 brand-font">SELLER VERIFICATION</h2>
        <p className="text-slate-500 mb-10 font-medium text-sm leading-relaxed px-4">
          প্রোডাক্ট বিক্রি করতে হলে আপনাকে সেলার হিসেবে ভেরিফাই হতে হবে। নিচে ক্লিক করে আপনার তথ্য পাঠান।
        </p>
        <button onClick={handleVerificationRequest} disabled={submitting} className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all">
          ভেরিফিকেশন রিকোয়েস্ট পাঠান
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 pb-40 animate-fade-in">
      <div className="mb-12">
        <h1 className="text-2xl font-black uppercase mb-2 brand-font italic text-slate-900 dark:text-white">
          DEEP <span className="text-primary">{productId ? 'UPDATE' : 'PUBLISH'}</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          আপনার প্রোডাক্টের বিস্তারিত তথ্য এখানে দিন
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[48px] border border-slate-100 dark:border-white/5 space-y-10 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">প্রোডাক্টের নাম</label>
              <input required placeholder="যেমন: iPhone 15 Pro Max" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">মূল্য (৳)</label>
                 <input required type="number" placeholder="৳" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl font-black text-primary outline-none border border-transparent focus:border-primary/20 transition-all" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ক্যাটাগরি</label>
                 <select required className="w-full h-14 px-4 bg-slate-50 dark:bg-black/40 rounded-2xl font-black uppercase text-[10px] outline-none border border-transparent focus:border-primary/20 transition-all cursor-pointer" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">সিলেক্ট</option>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                 </select>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">ছবির ডিরেক্ট লিংক</label>
              <input required placeholder="https://image-link.com/img.jpg" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all" value={form.image} onChange={e => setForm({...form, image: e.target.value})} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-primary pl-1">Deep Pay পেমেন্ট ইমেইল</label>
                <input 
                  placeholder="পেমেন্ট রিসিভ করার ইমেইল" 
                  className="w-full h-14 px-6 bg-white dark:bg-black rounded-2xl outline-none font-black text-xs border border-transparent focus:border-primary transition-all" 
                  value={form.paymentEmail} 
                  onChange={e => setForm({...form, paymentEmail: e.target.value})} 
                />
                <p className="text-[9px] font-bold text-slate-500 leading-relaxed px-1">
                   এটি আপনার Deep Pay ওয়ালেট ইমেইল। যদি খালি রাখেন তবে আপনার বর্তমান অ্যাকাউন্ট ইমেইলটিই ব্যবহৃত হবে। বিক্রিত পণ্যের টাকা এই ইমেইলে জমা হবে।
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">হোয়াটসঅ্যাপ নম্বর</label>
              <input required placeholder="০১৭XXXXXXXX" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">পণ্য সম্পর্কে কিছু বলুন</label>
              <textarea required placeholder="বিস্তারিত বিবরণ..." className="w-full p-6 bg-slate-50 dark:bg-black/40 rounded-2xl h-32 outline-none font-medium text-sm leading-relaxed border border-transparent focus:border-primary/20 transition-all" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-8">
           <button 
             disabled={submitting} 
             className="w-full md:w-80 h-16 bg-primary text-white rounded-full font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
           >
            {submitting ? 'প্রসেসিং...' : (productId ? 'আপডেট করুন' : 'পাবলিশ করুন')}
           </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
