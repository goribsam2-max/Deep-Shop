
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';
import { sendTelegramNotification } from '../services/telegram';
import { NotificationContext } from '../App';

interface CheckoutProps {
  user: User | null;
}

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'advance' | 'trust'>('advance');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [orderCompleted, setOrderCompleted] = useState(false);
  
  const [trustData, setTrustData] = useState({
    idType: 'NID',
    parentName: '',
    parentPhone: ''
  });

  const [addressData, setAddressData] = useState({
    fullAddress: user?.address || '',
    district: user?.district || '',
    thana: user?.thana || '',
    postalCode: user?.postalCode || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    const loadItems = () => {
      const items = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartItems(items);
      if (items.length === 0 && !orderCompleted) {
        notify('Your cart is empty', 'info');
        navigate('/cart');
      }
    };
    loadItems();
  }, [navigate, notify, orderCompleted]);

  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  const handleWhatsAppVerification = () => {
    const adminPhone = '8801778953114';
    const message = encodeURIComponent(`আমি আমার NID এবং আমার মা/বাবার NID নম্বর দিচ্ছি, আমার অর্ডারটি কনফার্ম করুন।`);
    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
  };

  const placeOrder = async () => {
    if (!user) return notify('Please login to continue', 'error');
    if (!addressData.phone || !addressData.fullAddress) return notify('Contact info and address are required', 'error');
    
    if (paymentMode === 'advance') {
      if (!paymentMethod) return notify('Please select a payment method', 'error');
      if (transactionId.length < 8) return notify('Invalid Transaction ID', 'error');
    } else {
      if (!trustData.parentName || !trustData.parentPhone) return notify('Parent info is required for Trust verification', 'error');
    }

    setLoading(true);
    try {
      const orderData: any = {
        userInfo: { userId: user.uid, userName: user.name, phone: addressData.phone },
        products: cartItems.map((i: any) => ({ productId: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        totalAmount: subtotal,
        advancePaid: paymentMode === 'advance' ? 300 : 0,
        paymentMethod: paymentMode === 'advance' ? paymentMethod : 'no-advance',
        status: 'pending',
        address: addressData,
        timestamp: serverTimestamp(),
      };

      if (paymentMode === 'advance') orderData.transactionId = transactionId;
      else orderData.trustProof = trustData;

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      const productList = cartItems.map((p: any) => `• ${p.quantity}x ${p.name}`).join('\n');
      let msg = `📦 <b>New Order Received!</b>\n`;
      msg += `Order ID: #${docRef.id.substring(0,8)}\nCustomer: ${user.name}\n\n`;
      msg += `<b>Items:</b>\n${productList}\n\n`;
      msg += `Total: ৳${subtotal.toLocaleString()}\n`;
      
      if (paymentMode === 'advance') {
        msg += `Advance: ৳300 (${paymentMethod?.toUpperCase()})\nTxn ID: ${transactionId}\n`;
      }
      
      msg += `\n<b>Shipping To:</b>\n${addressData.fullAddress}\nPhone: ${addressData.phone}`;
      
      await sendTelegramNotification(msg);
      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      setOrderCompleted(true);
      notify('Order placed successfully!', 'success');
      
      if (paymentMode === 'advance') setTimeout(() => navigate('/profile'), 2000);
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (orderCompleted && paymentMode === 'trust') {
    return (
      <div className="max-w-2xl mx-auto p-8 py-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">
          <i className="fas fa-check"></i>
        </div>
        <h2 className="text-3xl font-black mb-4 uppercase">Order Submitted!</h2>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">
          আপনার অর্ডারটি সফলভাবে রিকোয়েস্ট করা হয়েছে। এখন ভেরিফিকেশনের জন্য নিচের বাটনে ক্লিক করে আমাদের WhatsApp-এ প্রয়োজনীয় ডকুমেন্টস জমা দিন।
        </p>
        <button 
          onClick={handleWhatsAppVerification}
          className="w-full h-16 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-xl shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <i className="fab fa-whatsapp text-2xl"></i>
          Verify on WhatsApp
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-primary transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 pb-40 animate-fade-in">
      <h1 className="text-3xl font-black mb-12 uppercase tracking-tight">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <section className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-8 rounded-2xl shadow-sm">
            <h2 className="font-bold text-xs uppercase tracking-widest mb-8 text-slate-400">01. Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Street Address</label>
                <input placeholder="Full Address" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.fullAddress} onChange={e => setAddressData({...addressData, fullAddress: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">District</label>
                <input placeholder="City" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.district} onChange={e => setAddressData({...addressData, district: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Phone Number</label>
                <input placeholder="01XXXXXXXXX" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none" value={addressData.phone} onChange={e => setAddressData({...addressData, phone: e.target.value})} />
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-8 rounded-2xl shadow-sm">
            <h2 className="font-bold text-xs uppercase tracking-widest mb-8 text-slate-400">02. Payment Method</h2>
            
            <div className="flex gap-4 mb-10">
              <button 
                onClick={() => setPaymentMode('advance')} 
                className={`flex-1 h-14 rounded-2xl font-black uppercase text-[9px] tracking-widest border-2 transition-all flex flex-col items-center justify-center gap-1 ${paymentMode === 'advance' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 dark:border-white/5 text-slate-400'}`}
              >
                <span>Advance Payment</span>
                <span className="opacity-60 text-[7px]">৳300 Booking</span>
              </button>
              <button 
                onClick={() => setPaymentMode('trust')} 
                className={`flex-1 h-14 rounded-2xl font-black uppercase text-[9px] tracking-widest border-2 transition-all flex flex-col items-center justify-center gap-1 ${paymentMode === 'trust' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-50 dark:border-white/5 text-slate-400'}`}
              >
                <span>No Advance</span>
                <span className="opacity-60 text-[7px]">Manual Verification</span>
              </button>
            </div>

            {paymentMode === 'advance' ? (
              <div className="animate-fade-in">
                <p className="text-sm text-slate-500 mb-6 font-medium">Please send ৳300 advance to: <b className="text-primary">01778953114</b></p>
                <div className="flex gap-4 mb-8">
                  <button onClick={() => setPaymentMethod('bkash')} className={`flex-1 h-12 rounded-xl font-bold uppercase text-[10px] border-2 transition-all ${paymentMethod === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-500' : 'border-slate-100 dark:border-white/5'}`}>bKash</button>
                  <button onClick={() => setPaymentMethod('nagad')} className={`flex-1 h-12 rounded-xl font-bold uppercase text-[10px] border-2 transition-all ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-50 text-orange-500' : 'border-slate-100 dark:border-white/5'}`}>Nagad</button>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Transaction ID</label>
                  <input placeholder="ENTER TRX ID" className="w-full h-14 px-6 bg-slate-50 dark:bg-black/20 rounded-xl font-mono text-center font-black text-xl tracking-widest border border-primary/10 focus:border-primary transition-all outline-none" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="animate-fade-in space-y-6">
                <div className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl mb-6 text-[11px] text-red-600 dark:text-red-400 font-bold uppercase tracking-tight">
                    <i className="fas fa-info-circle mr-2"></i>
                    কনো অ্যাডভান্স ছাড়া অর্ডার করতে আপনার এবং আপনার মা/বাবার NID নম্বর এবং নম্বর দিন।
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">ID Type</label>
                    <select className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold uppercase text-[10px]" value={trustData.idType} onChange={e => setTrustData({...trustData, idType: e.target.value})}>
                      <option value="NID">National ID (NID)</option>
                      <option value="BirthCert">Birth Certificate</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Parent Name</label>
                    <input placeholder="Father/Mother Name" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold text-xs" value={trustData.parentName} onChange={e => setTrustData({...trustData, parentName: e.target.value})} />
                  </div>
                  <div className="col-span-full">
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Parent Phone Number</label>
                    <input placeholder="01XXXXXXXXX" className="w-full h-12 px-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/10 rounded-xl outline-none font-bold text-xs" value={trustData.parentPhone} onChange={e => setTrustData({...trustData, parentPhone: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[32px] h-max lg:sticky lg:top-24 shadow-2xl">
           <h3 className="font-bold text-xs uppercase tracking-widest mb-8 text-center text-slate-400">Order Summary</h3>
           <div className="space-y-4 mb-8">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex justify-between text-[11px] font-medium opacity-80">
                  <span className="truncate flex-1 pr-4">{item.name} x{item.quantity}</span>
                  <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
           </div>
           <div className="pt-6 border-t border-white/10 mb-8 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-400">Total Amount</span>
              <span className="text-2xl font-black">৳{subtotal.toLocaleString()}</span>
           </div>
           <button 
             onClick={placeOrder} 
             disabled={loading}
             className="w-full h-14 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
           >
             {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Place Order'}
           </button>
           <p className="text-[8px] text-center mt-6 text-slate-500 font-bold uppercase tracking-[0.2em]">Secure Checkout • Deep Shop Bangladesh</p>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
