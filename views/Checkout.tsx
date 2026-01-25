

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { User, SiteConfig } from '../types';
import { sendTelegramNotification } from '../services/telegram';
import { NotificationContext } from '../App';
import Loader from '../components/Loader';

interface CheckoutProps {
  user: User | null;
}

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useContext(NotificationContext);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<'advance' | 'nid' | 'none'>('advance');
  
  const [parentType, setParentType] = useState<'Mother' | 'Father'>('Father');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [addressData, setAddressData] = useState({
    fullName: user?.name || '',
    fullAddress: user?.address || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) {
        const c = snap.data() as SiteConfig;
        setConfig(c);
        if (!c.advanceRequired && !c.nidRequired) setCheckoutMode('none');
        else if (c.advanceRequired) setCheckoutMode('advance');
        else if (c.nidRequired) setCheckoutMode('nid');
      }
      setLoading(false);
    });

    const items = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(items);
    if (items.length === 0 && !searchParams.get('status')) navigate('/cart');

    const status = searchParams.get('status');
    const trxId = searchParams.get('trxid');
    const savedOrderDetails = localStorage.getItem('pendingOrderDetails');

    if (status === 'success' && trxId && savedOrderDetails) {
      const parsedDetails = JSON.parse(savedOrderDetails);
      finalizeOrder(trxId, 'Deep Pay Advance', parsedDetails.address);
      localStorage.removeItem('pendingOrderDetails');
    }

    return () => unsubConfig();
  }, [searchParams]);

  const subtotal = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const primaryItem = cartItems[0];
  const sellerEmail = primaryItem?.sellerPaymentEmail || 'admin@deepshop.com';

  const handleDeepPayRedirect = () => {
    if (!addressData.fullName || !addressData.phone || !addressData.fullAddress) {
      return notify('ডেলিভারি তথ্য আগে পূর্ণ করুন।', 'error');
    }
    localStorage.setItem('pendingOrderDetails', JSON.stringify({ address: addressData }));
    const callbackUrl = encodeURIComponent(`${window.location.origin}/#/checkout`);
    const deepPayUrl = `https://payment.deepshop.top/#/gateway-pay?amount=300&to=${sellerEmail}&callback=${callbackUrl}`;
    setLoading(true);
    notify('পেমেন্ট গেটওয়েতে পাঠানো হচ্ছে...', 'info');
    setTimeout(() => { window.location.href = deepPayUrl; }, 1200);
  };

  const finalizeOrder = async (txId: string | null, method: string, address: any) => {
    setLoading(true);
    try {
      const items = JSON.parse(localStorage.getItem('cart') || '[]');
      const orderSubtotal = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      
      const orderData = {
        userInfo: { userId: user?.uid || 'guest', userName: address.fullName, phone: address.phone },
        sellerId: items[0]?.sellerId || null,
        products: items.map((i: any) => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        totalAmount: orderSubtotal,
        status: 'pending',
        address: address,
        timestamp: serverTimestamp(),
        verificationType: checkoutMode,
        advancePaid: checkoutMode === 'advance' ? 300 : 0,
        paymentMethod: method,
        transactionId: txId || '',
        parentInfo: checkoutMode === 'nid' ? { parentType, parentName, parentPhone } : null
      };

      await addDoc(collection(db, 'orders'), orderData);

      // Build Rich Telegram Message
      let productList = items.map((item: any) => `• ${item.name} (৳${item.price} x ${item.quantity})`).join('\n');
      
      let tgMsg = `📦 <b>নতুন অর্ডার প্রাপ্তি!</b>\n\n`;
      tgMsg += `🛠 <b>ধরন:</b> ${checkoutMode === 'nid' ? 'NID ভেরিফিকেশন' : checkoutMode === 'advance' ? 'Deep Pay অগ্রিম' : 'Cash on Delivery'}\n`;
      tgMsg += `👤 <b>ইউজার:</b> ${address.fullName}\n`;
      tgMsg += `📞 <b>ফোন:</b> ${address.phone}\n\n`;

      if (checkoutMode === 'nid') {
        tgMsg += `🛡 <b>অভিভাবক তথ্য:</b>\n`;
        tgMsg += `▫️ ধরন: ${parentType}\n`;
        tgMsg += `▫️ নাম: ${parentName}\n`;
        tgMsg += `▫️ ফোন: ${parentPhone}\n\n`;
      }

      if (txId) {
        tgMsg += `💳 <b>পেমেন্ট ডিটেইলস:</b>\n`;
        tgMsg += `▫️ TrxID: ${txId}\n`;
        tgMsg += `▫️ পরিমাণ: ৳৩০০ (অগ্রিম)\n\n`;
      }

      tgMsg += `🛍 <b>পণ্যসমূহ:</b>\n${productList}\n\n`;
      tgMsg += `💰 <b>মোট বিল:</b> ৳${orderSubtotal}\n`;
      tgMsg += `📍 <b>ঠিকানা:</b> ${address.fullAddress}\n`;
      tgMsg += `⏰ <b>সময়:</b> ${new Date().toLocaleString()}`;

      await sendTelegramNotification(tgMsg);
      
      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('অর্ডার সফল হয়েছে!', 'success');
      navigate('/profile');
    } catch (e: any) { notify(e.message, 'error'); }
    finally { setLoading(false); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in bg-white dark:bg-black">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => navigate(-1)} className="w-11 h-11 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center transition-all active:scale-90"><i className="fas fa-chevron-left"></i></button>
        <h1 className="text-3xl font-black uppercase brand-font leading-none italic">DEEP <span className="text-primary">CHECKOUT</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Section 01: Delivery Info */}
          <section className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[44px] border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-[10px] font-black italic">01</div>
               <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">ডেলিভারি তথ্য</h2>
            </div>
            <div className="space-y-4">
               <input placeholder="পুরো নাম" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all" value={addressData.fullName} onChange={e => setAddressData({...addressData, fullName: e.target.value})} />
               <input placeholder="মোবাইল নম্বর" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-bold text-sm border border-transparent focus:border-primary/20 transition-all" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
               <textarea placeholder="বিস্তারিত ঠিকানা (থানা, জেলাসহ)" className="w-full h-32 p-6 bg-slate-50 dark:bg-black/20 rounded-2xl outline-none font-medium text-sm leading-relaxed border border-transparent focus:border-primary/20 transition-all" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
            </div>
          </section>

          {/* Section 02: Verification Method */}
          <section className="bg-white dark:bg-zinc-900 p-8 md:p-10 rounded-[44px] border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center text-[10px] font-black italic">02</div>
               <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">ভেরিফিকেশন পদ্ধতি</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
               {config?.advanceRequired && (
                 <button onClick={() => setCheckoutMode('advance')} className={`flex-1 p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'advance' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-white/10 opacity-40 grayscale'}`}>
                    <i className="fas fa-money-check-dollar text-xl mb-1 text-primary"></i>
                    <p className="font-black text-[10px] uppercase tracking-widest">৳৩০০ অগ্রিম দিন</p>
                 </button>
               )}
               {config?.nidRequired && (
                 <button onClick={() => setCheckoutMode('nid')} className={`flex-1 p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'nid' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-100 dark:border-white/10 opacity-40 grayscale'}`}>
                    <i className="fas fa-id-card-clip text-xl mb-1 text-indigo-500"></i>
                    <p className="font-black text-[10px] uppercase tracking-widest">টাকা ছাড়া (NID)</p>
                 </button>
               )}
               {!config?.advanceRequired && !config?.nidRequired && (
                 <button onClick={() => setCheckoutMode('none')} className={`flex-1 p-8 rounded-[32px] border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${checkoutMode === 'none' ? 'border-green-500 bg-green-500/5' : 'border-slate-100 dark:border-white/10 opacity-40 grayscale'}`}>
                    <i className="fas fa-truck-ramp-box text-xl mb-1 text-green-500"></i>
                    <p className="font-black text-[10px] uppercase tracking-widest">নগদ মূল্যে (COD)</p>
                 </button>
               )}
            </div>

            {/* Advance Payment UI */}
            {checkoutMode === 'advance' && (
              <div className="space-y-6 animate-slide-up">
                 <button onClick={handleDeepPayRedirect} className="w-full h-20 rounded-[28px] font-black uppercase tracking-[0.2em] bg-rose-600 text-white shadow-2xl shadow-rose-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xs">
                   <i className="fas fa-wallet text-xl"></i> Pay with Deep Pay
                 </button>
                 <p className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest">অগ্রিম ৩০০ টাকা পরিশোধ করে অর্ডার কনফার্ম করুন</p>
              </div>
            )}

            {/* NID Verification UI (New Styled Button) */}
            {checkoutMode === 'nid' && (
              <div className="space-y-8 animate-slide-up">
                 <div className="flex gap-4">
                   <button onClick={() => setParentType('Father')} className={`flex-1 h-16 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Father' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-slate-100 dark:border-white/5 opacity-40'}`}>বাবার এনআইডি</button>
                   <button onClick={() => setParentType('Mother')} className={`flex-1 h-16 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${parentType === 'Mother' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600' : 'border-slate-100 dark:border-white/5 opacity-40'}`}>মায়ের এনআইডি</button>
                 </div>
                 <div className="space-y-4">
                    <input placeholder="এনআইডি অনুযায়ী নাম" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm border border-transparent focus:border-indigo-500/20" value={parentName} onChange={e => setParentName(e.target.value)} />
                    <input placeholder="অভিভাবকের মোবাইল নম্বর" className="w-full h-16 px-6 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold outline-none text-sm border border-transparent focus:border-indigo-500/20" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
                 </div>
                 
                 {/* Premium NID Verification Button */}
                 <button 
                    onClick={() => {
                        if(!parentName || !parentPhone) return notify('অভিভাবকের তথ্য দিন', 'error');
                        finalizeOrder(null, 'COD NID Verified', addressData);
                    }} 
                    className="group relative w-full h-20 bg-slate-900 dark:bg-white dark:text-black text-white rounded-[32px] overflow-hidden transition-all active:scale-95 shadow-2xl"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-center gap-4">
                        <div className="w-10 h-10 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <i className="fas fa-shield-halved text-lg"></i>
                        </div>
                        <div className="text-left">
                            <p className="text-[11px] font-black uppercase tracking-widest leading-none">ভেরিফাই করে অর্ডার করুন</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 mt-1.5">Secure Identity Verification</p>
                        </div>
                    </div>
                 </button>
              </div>
            )}

            {/* COD UI */}
            {checkoutMode === 'none' && (
              <button onClick={() => finalizeOrder(null, 'Cash on Delivery', addressData)} className="w-full h-20 bg-primary text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/30 active:scale-95 transition-all">কনফার্ম অর্ডার</button>
            )}
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="bg-white dark:bg-zinc-900 p-10 rounded-[56px] h-max lg:sticky lg:top-24 shadow-2xl border border-slate-100 dark:border-white/5">
           <div className="mb-10 text-center border-b border-slate-50 dark:border-white/5 pb-10">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">অর্ডার সামারি</span>
             <h3 className="text-5xl font-black text-slate-900 dark:text-white mt-4 brand-font italic tracking-tighter">৳{subtotal.toLocaleString()}</h3>
           </div>
           <div className="space-y-6">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-black rounded-2xl flex items-center justify-center p-3 border border-slate-100 dark:border-white/5 shadow-inner">
                     <img src={item.image} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[11px] font-black uppercase truncate tracking-tight">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">৳{item.price.toLocaleString()} x {item.quantity}</p>
                  </div>
                </div>
              ))}
           </div>
           <div className="mt-10 pt-10 border-t border-slate-50 dark:border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase text-slate-400">ডেলিভারি চার্জ</span>
                 <span className="text-[10px] font-black uppercase text-green-500">ফ্রি (শর্তসাপেক্ষ)</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
