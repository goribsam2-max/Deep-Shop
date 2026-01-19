
import React, { useRef } from 'react';
import { Order } from '../types';
import html2canvas from 'html2canvas';

interface ReceiptProps {
  order: Order;
  onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ order, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    const link = document.createElement('a');
    link.download = `DeepShop_Receipt_${order.id.substring(0,8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg flex flex-col gap-4">
        <div ref={receiptRef} className="bg-white text-slate-900 p-10 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Branded Watermark */}
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <i className="fas fa-gem text-9xl"></i>
          </div>

          <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <i className="fas fa-gem text-xs"></i>
                </div>
                <span className="text-xl font-black tracking-tighter text-primary">DEEP SHOP</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premium Tech Destination</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black mb-1">INVOICE</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase">#{order.id.substring(0,12)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Information</h4>
              <p className="font-bold text-sm">{order.userInfo?.userName}</p>
              <p className="text-xs text-slate-500 mt-1">{order.userInfo?.phone}</p>
              <p className="text-xs text-slate-500">{order.address?.district}, BD</p>
            </div>
            <div className="text-right">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Date</h4>
              <p className="font-bold text-sm">
                {order.timestamp?.seconds 
                  ? new Date(order.timestamp.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
                  : 'Processing'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Payment: {order.paymentMethod?.toUpperCase() || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-4 mb-12">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Purchase Details</h4>
            {order.products?.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-slate-50 rounded flex items-center justify-center text-[10px] font-bold">{p.quantity}</span>
                  <span className="font-semibold">{p.name}</span>
                </div>
                <span className="font-black">৳{((p.price || 0) * (p.quantity || 1)).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-500">
              <span>Subtotal</span>
              <span>৳{(order.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-success">
              <span>Advance Paid</span>
              <span>- ৳{(order.advancePaid || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="text-xs font-black uppercase tracking-widest">Balance (COD)</span>
              <span className="text-3xl font-black text-primary">৳{(order.totalAmount || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-16 text-center border-t-2 border-dashed border-slate-100 pt-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Thank you for choosing Deep Shop</p>
            <div className="flex justify-center gap-4 text-slate-300">
              <i className="fab fa-facebook-f"></i>
              <i className="fab fa-instagram"></i>
              <i className="fab fa-telegram-plane"></i>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 h-14 glass text-white rounded-2xl font-bold transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={downloadReceipt}
            className="flex-[2] h-14 bg-white text-primary rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <i className="fas fa-download"></i>
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
