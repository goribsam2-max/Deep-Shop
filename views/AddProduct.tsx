

import React, { useState, useEffect, useContext, useRef } from 'react';
import { db, auth } from '../services/firebase';
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { NotificationContext } from '../App';
import { User, Product } from '../types';
import Loader from '../components/Loader';
import { sendTelegramNotification } from '../services/telegram';
import { PRODUCT_CATEGORIES } from '../constants';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const AddProduct: React.FC = () => {
  const { productId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  const [form, setForm] = useState({
    name: '',
    image: '', // Comma separated links
    price: '',
    description: '',
    category: '',
    paymentEmail: '',
    whatsapp: '',
    stock: 'instock' as 'instock' | 'outstock'
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!auth.currentUser) { navigate('/auth'); return; }
      const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (uSnap.exists()) {
        const userData = { uid: uSnap.id, ...uSnap.data() } as User;
        setUser(userData);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        if (data.success) {
          uploadedUrls.push(data.data.url);
        } else {
          notify(`ফাইল ${i + 1} আপলোড ব্যর্থ হয়েছে`, 'error');
        }
      }

      if (uploadedUrls.length > 0) {
        const currentImages = form.image ? form.image.split(',').filter(l => l.trim() !== '') : [];
        const newImageList = [...currentImages, ...uploadedUrls].join(',');
        setForm(prev => ({ ...prev, image: newImageList }));
        notify(`${uploadedUrls.length}টি ছবি আপলোড সফল!`, 'success');
      }
    } catch (error) {
      notify('ছবি আপলোডে সমস্যা হয়েছে', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.image.split(',').filter(l => l.trim() !== '');
    currentImages.splice(index, 1);
    setForm(prev => ({ ...prev, image: currentImages.join(',') }));
  };

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
    if (!form.name || !form.price || !form.category || !form.whatsapp || !form.image) return notify('সব তথ্য ও অন্তত একটি ছবি দিন।', 'error');
    
    setSubmitting(true);
    try {
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

  const imageArray = form.image ? form.image.split(',').filter(l => l.trim() !== '') : [];

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
          <div className="space-y-8">
            {/* Image Upload Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2 tracking-widest">প্রোডাক্টের ছবি সমূহ</label>
              
              <div className="grid grid-cols-3 gap-3">
                 {imageArray.map((url, idx) => (
                   <div key={idx} className="aspect-square rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                   </div>
                 ))}
                 
                 <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-all text-slate-400 hover:text-primary active:scale-95"
                 >
                    {uploading ? (
                      <i className="fas fa-spinner animate-spin text-lg"></i>
                    ) : (
                      <>
                        <i className="fas fa-plus text-lg"></i>
                        <span className="text-[8px] font-black uppercase">সিলেক্ট করুন</span>
                      </>
                    )}
                 </button>
              </div>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
              />
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">একাধিক ছবি সিলেক্ট করা যাবে </p>
            </div>

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
              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">স্টক স্ট্যাটাস</label>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setForm({...form, stock: 'instock'})}
                  className={`flex-1 h-12 rounded-xl font-black text-[10px] uppercase border transition-all ${form.stock === 'instock' ? 'bg-green-500 text-white border-green-500 shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200'}`}
                >
                  <i className="fas fa-check-circle mr-2"></i> In Stock
                </button>
                <button 
                  type="button" 
                  onClick={() => setForm({...form, stock: 'outstock'})}
                  className={`flex-1 h-12 rounded-xl font-black text-[10px] uppercase border transition-all ${form.stock === 'outstock' ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200'}`}
                >
                  <i className="fas fa-times-circle mr-2"></i> Out Stock
                </button>
              </div>
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
                   এটি আপনার Deep Pay ওয়ালেট ইমেইল। যদি খালি রাখেন তবে আপনার বর্তমান অ্যাকাউন্ট ইমেইলটিই ব্যবহৃত হবে।
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

            {/* Hidden field for image links (kept for state management) */}
            <input type="hidden" value={form.image} />
          </div>
        </div>

        <div className="flex justify-center pt-8">
           <button 
             disabled={submitting || uploading} 
             className="w-full md:w-80 h-16 bg-primary text-white rounded-full font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
           >
            {submitting ? 'প্রসেসিং...' : uploading ? 'ছবি আপলোড হচ্ছে...' : (productId ? 'আপডেট করুন' : 'পাবলিশ করুন')}
           </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
