

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, increment, updateDoc, deleteDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, User } from '../types';
import Loader from '../components/Loader';
import RankBadge from '../components/RankBadge';
import { NotificationContext } from '../App';

interface ProductDetailProps {
  user: User | null;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [seller, setSeller] = useState<User | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user is Admin or the Seller who posted this
  const canManage = user && product && (user.isAdmin || user.uid === product.sellerId);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productRef = doc(db, 'products', id);
        const docSnap = await getDoc(productRef);
        
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(prodData);
          setImages(prodData.image.split(','));
          await updateDoc(productRef, { views: increment(1) });
          
          if (prodData.sellerId) {
            const uSnap = await getDoc(doc(db, 'users', prodData.sellerId));
            if (uSnap.exists()) setSeller({ uid: uSnap.id, ...uSnap.data() } as User);
          }

          // Fetch Related Products
          const relatedQ = query(
            collection(db, 'products'), 
            where('category', '==', prodData.category), 
            limit(6)
          );
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchProduct();
  }, [id]);

  const addToCart = () => {
    if (!product || product.stock !== 'instock') return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1, image: images[0] });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('ব্যাগ-এ যোগ করা হয়েছে!', 'success');
  };

  const startChat = async () => {
    if (!user) return navigate('/auth');
    if (!product || !seller) return;
    if (user.uid === seller.uid) return notify('নিজে নিজেকে মেসেজ করা যাবে না!', 'info');

    const chatId = [user.uid, seller.uid].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    setLoading(true);
    try {
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, seller.uid],
          participantData: {
            [user.uid]: { name: user.name, pic: user.profilePic || '' },
            [seller.uid]: { name: seller.name, pic: seller.profilePic || '' }
          },
          lastMessage: `ইনকোয়ারি: ${product.name}`,
          lastMessageTime: serverTimestamp(),
          unreadCount: { [seller.uid]: 1, [user.uid]: 0 }
        });

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          senderId: user.uid,
          text: `হ্যালো! আমি "${product.name}" সম্পর্কে জানতে চাচ্ছি।`,
          timestamp: serverTimestamp()
        });
      }
      navigate(`/chat/${chatId}`);
    } catch (e: any) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product || !window.confirm('আপনি কি নিশ্চিতভাবে এই প্রোডাক্টটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'products', product.id));
      notify('প্রোডাক্ট সফলভাবে মুছে ফেলা হয়েছে', 'success');
      navigate('/');
    } catch (e: any) {
      notify(e.message, 'error');
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">প্রোডাক্ট পাওয়া যায়নি</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in pb-40 relative">
      <div className="flex flex-col lg:flex-row gap-10">
        
        {/* Left: Images */}
        <div className="lg:w-1/2 space-y-6">
           <div className="bg-slate-50 dark:bg-zinc-900 rounded-[40px] p-8 md:p-12 flex items-center justify-center border border-slate-100 dark:border-white/5 overflow-hidden shadow-inner relative group">
              <img src={images[activeImage]} className="max-h-[450px] object-contain transition-transform group-hover:scale-105 duration-700" alt={product.name} />
              
              {/* Management Controls Overlay */}
              {canManage && (
                <div className="absolute top-6 right-6 flex flex-col gap-3">
                   <button onClick={() => navigate(`/edit-product/${product.id}`)} className="w-12 h-12 bg-white dark:bg-zinc-800 text-slate-700 dark:text-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/10 active:scale-90 transition-all">
                      <i className="fas fa-edit"></i>
                   </button>
                   <button onClick={handleDelete} className="w-12 h-12 bg-rose-500 text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
                      <i className="fas fa-trash-alt"></i>
                   </button>
                </div>
              )}
           </div>
           
           <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
             {images.map((img, idx) => (
               <div key={idx} onClick={() => setActiveImage(idx)} className={`w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 p-2 border-2 cursor-pointer transition-all shrink-0 ${activeImage === idx ? 'border-primary shadow-lg scale-105' : 'border-transparent opacity-50'}`}>
                 <img src={img} className="w-full h-full object-contain" alt="" />
               </div>
             ))}
           </div>
        </div>

        {/* Right: Info */}
        <div className="lg:w-1/2 flex flex-col pt-4">
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black mb-4 uppercase tracking-tight leading-tight text-slate-900 dark:text-white brand-font">{product.name}</h1>
            <p className="text-4xl font-black brand-font text-primary">৳{product.price.toLocaleString()}</p>
          </div>
          
          <div className="p-8 rounded-[32px] bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 mb-8">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">পণ্যের বিবরণ</h3>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed text-sm whitespace-pre-wrap">{product.description}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <button 
              onClick={addToCart} 
              disabled={product.stock !== 'instock'}
              className={`h-16 rounded-[24px] font-black text-[11px] uppercase tracking-widest border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 active:scale-95 transition-all ${product.stock !== 'instock' ? 'opacity-50 grayscale' : 'text-slate-600'}`}
            >
              ব্যাগ-এ যোগ করুন
            </button>
            <button 
              onClick={() => { addToCart(); navigate('/checkout'); }} 
              disabled={product.stock !== 'instock'}
              className={`h-16 rounded-[24px] font-black text-[11px] uppercase tracking-widest bg-primary text-white shadow-2xl shadow-primary/20 active:scale-95 transition-all ${product.stock !== 'instock' ? 'opacity-50 grayscale' : ''}`}
            >
              এখনই কিনুন
            </button>
          </div>

          {/* Seller Card (Enhanced) */}
          {seller && (
            <div className="bg-slate-50 dark:bg-white/5 rounded-[40px] border border-slate-100 dark:border-white/5 p-8 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <Link to={`/seller/${seller.uid}`} className="flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-[24px] overflow-hidden shadow-lg border-2 border-white dark:border-zinc-800 transition-transform group-hover:scale-110">
                       <img src={seller.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                       <h4 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{seller.name}</h4>
                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">অফিসিয়াল সেলার</span>
                    </div>
                  </Link>
                  <RankBadge rank={seller.rankOverride || 'bronze'} size="sm" showLabel={false} />
               </div>
               
               <button 
                  onClick={startChat}
                  className="w-full h-14 bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
               >
                  <i className="fas fa-comment-dots text-lg"></i> সেলারকে মেসেজ দিন
               </button>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <section className="mt-24">
           <div className="flex items-center gap-6 mb-10 px-4">
              <h2 className="text-xl font-black uppercase brand-font tracking-tight">রিলেটেড <span className="text-primary">পণ্য</span></h2>
              <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {related.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] p-5 shadow-sm hover:shadow-xl transition-all">
                   <div className="aspect-square bg-slate-50 dark:bg-black/20 rounded-2xl mb-4 p-4 flex items-center justify-center">
                      <img src={p.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="" />
                   </div>
                   <h4 className="font-bold text-[11px] uppercase truncate mb-2 leading-tight text-slate-700 dark:text-slate-200">{p.name}</h4>
                   <p className="text-primary font-black brand-font text-xs">৳{p.price.toLocaleString()}</p>
                </Link>
              ))}
           </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
