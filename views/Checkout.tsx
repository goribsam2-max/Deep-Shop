
import React, { useState, useContext } from 'react';
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
  const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [addressData, setAddressData] = useState({
    fullAddress: user?.address || '',
    district: user?.district || '',
    thana: user?.thana || '',
    postalCode: user?.postalCode || '',
    phone: user?.phone || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressData({ ...addressData, [e.target.name]: e.target.value });
  };

  const placeOrder = async () => {
    if (!user) return notify('Please login to place an order', 'error');
    if (!paymentMethod) return notify('Select payment for advance fee', 'error');
    if (transactionId.length < 8) return notify('Invalid Transaction ID', 'error');
    if (!addressData.district || !addressData.fullAddress) return notify('Complete address is required', 'error');

    setLoading(true);
    try {
      const orderData = {
        userInfo: {
          userId: user.uid,
          userName: user.name,
          phone: addressData.phone
        },
        products: cartItems.map((i: any) => ({
          productId: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image
        })),
        totalAmount: subtotal,
        advancePaid: 300,
        transactionId: transactionId,
        paymentMethod: paymentMethod,
        status: 'pending',
        address: {
          fullAddress: addressData.fullAddress,
          district: addressData.district,
          thana: addressData.thana,
          postalCode: addressData.postalCode
        },
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      const productList = cartItems.map((p: any) => `• ${p.quantity}x ${p.name}`).join('\n');
      const msg = `🚀 <b>New Order Placed!</b>\nOrder ID: #${docRef.id.substring(0,8)}\nCustomer: ${user.name}\n\n<b>Items:</b>\n${productList}\n\nTotal: ৳${subtotal}\nAdvance: ৳300 (${paymentMethod.toUpperCase()})\nTXN ID: <code>${transactionId}</code>\nPhone: ${addressData.phone}`;
      await sendTelegramNotification(msg);

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      notify('Order successful!', 'success');
      
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) return navigate('/cart');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-32">
      <h1 className="text-3xl font-black mb-10 uppercase tracking-tighter">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-8">
          <section className="glass p-8 rounded-3xl shadow-xl border-white/20">
            <h2 className="font-black text-sm uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Shipping Info</h2>
            <div className="space-y-4">
              <input name="fullAddress" placeholder="Full Address" value={addressData.fullAddress} onChange={handleInputChange} className="w-full h-[50px] px-6 bg-slate-50 rounded-xl outline-none font-medium" />
              <div className="grid grid-cols-2 gap-4">
                <input name="district" placeholder="District" value={addressData.district} onChange={handleInputChange} className="h-[50px] px-6 bg-slate-50 rounded-xl font-medium" />
                <input name="phone" placeholder="Phone" value={addressData.phone} onChange={handleInputChange} className="h-[50px] px-6 bg-slate-50 rounded-xl font-black text-primary" />
              </div>
            </div>
          </section>

          <section className="glass p-8 rounded-3xl shadow-xl border-white/20">
            <h2 className="font-black text-sm uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Advance Fee (৳300)</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => setPaymentMethod('bkash')} className={`h-[50px] rounded-xl border-2 transition-all ${paymentMethod === 'bkash' ? 'border-primary bg-primary/5' : 'border-slate-100'}`}>bKash</button>
              <button onClick={() => setPaymentMethod('nagad')} className={`h-[50px] rounded-xl border-2 transition-all ${paymentMethod === 'nagad' ? 'border-orange-500 bg-orange-500/5' : 'border-slate-100'}`}>Nagad</button>
            </div>
            {paymentMethod && (
              <input placeholder="Transaction ID" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="w-full h-[50px] px-6 bg-slate-50 rounded-xl font-mono font-black tracking-widest uppercase text-center" />
            )}
          </section>
        </div>

        <div className="glass p-8 rounded-3xl shadow-2xl h-max sticky top-24 border-white/20">
           <h2 className="font-black text-sm uppercase tracking-widest mb-6">Order Total</h2>
           <div className="flex justify-between items-end mb-10">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Grand Total</span>
              <span className="text-4xl font-black text-primary">৳{subtotal.toLocaleString()}</span>
           </div>
           <button onClick={placeOrder} disabled={loading} className="w-full h-[50px] bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
             {loading ? 'Processing...' : 'Confirm Order'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
