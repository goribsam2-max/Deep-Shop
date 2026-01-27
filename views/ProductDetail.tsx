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

  // Management controls for admin or the specific seller
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
          setImages(prodData.image.split(',').filter(img => img.trim() !== ''));
          
          // Count views (background)
          updateDoc(productRef, { views: increment(1) }).catch(() => {});
          
          // Fetch Seller Info - Public Access
          if (prodData.sellerId) {
            const uSnap = await getDoc(doc(db, 'users', prodData.sellerId));
            if (uSnap.exists()) {
              setSeller({ uid: uSnap.id, ...uSnap.data() } as User);
            }
          }

          // Fetch Related Products - Public Access
          const relatedQ = query(
            collection(db, 'products'), 
            where('category', '==', prodData.category), 
            limit(6)
          );
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));
        }
      } catch (err) {
        console.error("Product Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const addToCart = () => {
    if (!product || product.stock !== 'instock') return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, image: images[0] });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('ব্যাগ-এ যোগ করা হয়েছে!', 'success');
  };

  const handleBuyNow = () => {
    if (!user) {
      notify('অর্ডার করতে আগে লগইন করুন', 'info');
      return navigate('/auth');
    }
    addToCart();
    navigate('/checkout');
  };

  const startChat = async () => {
    if (!user) {
      notify('মেসেজ করতে আগে লগইন করুন', 'info');
      return navigate('/auth');
    }
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
          senderName: user.name,
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
    <div className="flex-1 flex flex-col bg-white dark:bg-[#050505] animate-fade-in pb-40">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-10 py-8">
        
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Gallery - Public Visibility */}
          <div className="lg:w-1/2 space-y-6">
            <div className="relative aspect-square bg-slate-50 dark:bg-zinc-900 rounded-[40px] overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner group">
              <img 
                src={images[activeImage]} 
                className="w-full h-full object-contain p-8 md:p-12 transition-transform duration-700 group-hover:scale-105" 
                alt={product.name} 
              />
              
              {/* Management Buttons - Conditional Visibility */}
              {canManage && (
                <div className="absolute top-6 right-6 flex flex-col gap-3 z-20">
                   <button 
                    onClick={() => navigate(`/edit-product/${product.id}`)}
                    className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl flex items-center justify-center text-slate-600 dark:text-white border border-slate-100 dark:border-white/10 active:scale-90 transition-all"
                   >
                     <i className="fas fa-edit text-sm"></i>
                   </button>
                   <button 
                    onClick={handleDelete}
                    className="w-12 h-12 bg-rose-500 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all"
                   >
                     <i className="fas fa-trash-alt text-sm"></i>
                   </button>
                </div>
              )}

              <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">
                   <i className="fas fa-eye mr-2"></i> {product.views || 0} Views
                 </span>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
               {images.map((img, idx) => (
                 <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-20 rounded-2xl bg-slate-50 dark:bg-zinc-900 border-2 transition-all p-2 shrink-0 ${activeImage === idx ? 'border-primary shadow-lg scale-105' : 'border-transparent opacity-40'}`}
                 >
                   <img src={img} className="w-full h-full object-contain" alt="" />
                 </button>
               ))}
            </div>
          </div>

          {/* Info - Public Visibility */}
          <div className="lg:w-1/2 flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                 <span className="px-4 py-1.5 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/10">
                   {product.category}
                 </span>
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${product.stock === 'instock' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                   {product.stock === 'instock' ? 'In Stock' : 'Stock Out'}
                 </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black brand-font uppercase leading-tight text-slate-900 dark:text-white mb-4">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-4">
                 <span className="text-4xl font-black text-primary brand-font italic">৳{product.price.toLocaleString()}</span>
                 <span className="text-slate-400 text-xs font-bold uppercase tracking-widest line-through">৳{(product.price + 500).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-6 mb-10">
               <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[36px] border border-slate-100 dark:border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-[0.3em]">বিবরণ</h4>
                  <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap italic">
                    {product.description || 'এই প্রোডাক্টটির কোন বিবরণ পাওয়া যায়নি।'}
                  </p>
               </div>

               {/* Actions - Triggers Redirect if not logged in */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={addToCart}
                    disabled={product.stock !== 'instock'}
                    className="h-16 rounded-[22px] font-black uppercase text-[11px] tracking-widest border-2 border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
                  >
                    <i className="fas fa-shopping-bag"></i> ব্যাগ-এ রাখুন
                  </button>
                  <button 
                    onClick={handleBuyNow}
                    disabled={product.stock !== 'instock'}
                    className="h-16 rounded-[22px] font-black uppercase text-[11px] tracking-widest bg-primary text-white shadow-2xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-30"
                  >
                    এখনই কিনুন
                  </button>
               </div>
            </div>

            {/* Seller Card - Public Visibility */}
            {seller && (
               <div className="bg-slate-900 dark:bg-zinc-900 p-8 rounded-[44px] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full"></div>
                  <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                     <div className="flex items-center gap-6">
                        <div className="relative">
                           <img 
                            src={seller.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.name)}&background=e11d48&color=fff&bold=true`} 
                            className="w-20 h-20 rounded-[28px] object-cover border-4 border-white/10 shadow-xl" 
                            alt="" 
                           />
                           <div className="absolute -bottom-1 -right-1">
                             <RankBadge rank={seller.rankOverride || 'bronze'} size="sm" showLabel={false} />
                           </div>
                        </div>
                        <div>
                           <span className="text-[8px] font-black uppercase text-primary tracking-widest mb-1 block">OFFICIAL MERCHANT</span>
                           <h4 className="text-xl font-black uppercase brand-font tracking-tight">{seller.name}</h4>
                           <Link to={`/seller/${seller.uid}`} className="text-[10px] font-bold text-slate-400 hover:text-white underline transition-colors uppercase mt-1 inline-block">
                             ভিউ ফুল প্রোফাইল
                           </Link>
                        </div>
                     </div>
                     <button 
                      onClick={startChat}
                      className="w-full sm:w-auto px-8 h-14 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-90 transition-all flex items-center justify-center gap-3"
                     >
                       <i className="fas fa-comment-dots text-primary"></i> মেসেজ দিন
                     </button>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Related Products - Public Visibility */}
        {related.length > 0 && (
          <section className="mt-24">
             <div className="flex items-center gap-6 mb-12">
                <h2 className="text-2xl font-black uppercase brand-font tracking-tight">সদৃশ <span className="text-primary">পণ্যসমূহ</span></h2>
                <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {related.map(p => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] p-5 transition-all duration-500 hover:shadow-2xl flex flex-col h-full">
                     <div className="aspect-square bg-slate-50 dark:bg-black/20 rounded-[24px] mb-5 p-6 flex items-center justify-center overflow-hidden">
                        <img src={p.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="" />
                     </div>
                     <h4 className="font-bold text-[11px] uppercase truncate mb-2 leading-tight text-slate-800 dark:text-slate-200">{p.name}</h4>
                     <p className="text-primary font-black brand-font text-xs mt-auto">৳{p.price.toLocaleString()}</p>
                  </Link>
                ))}
             </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
