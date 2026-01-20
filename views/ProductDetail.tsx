
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, updateDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, User, Review, ReviewReply } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

interface ProductDetailProps {
  user: User | null;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docSnap = await getDoc(doc(db, 'products', id));
        if (docSnap.exists()) {
          const prodData = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(prodData);
          
          const relatedQ = query(collection(db, 'products'), where('category', '==', prodData.category), limit(4));
          const relSnap = await getDocs(relatedQ);
          setRelated(relSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.id !== id));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchProduct();

    const revQ = query(collection(db, 'reviews'), where('productId', '==', id), orderBy('timestamp', 'desc'));
    const unsubRev = onSnapshot(revQ, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as Review)));
    });

    return () => unsubRev();
  }, [id]);

  const isOutOfStock = product?.stock !== 'instock';

  const addToCart = () => {
    if (!product || isOutOfStock) return;
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify('Added to your cart successfully', 'success');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return notify('Please login to leave a review', 'info');
    if (!newReview.comment.trim()) return notify('Please write something', 'error');
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id, userId: user.uid, userName: user.name,
        rating: newReview.rating, comment: newReview.comment,
        likes: [], dislikes: [], replies: [], timestamp: serverTimestamp()
      });
      setNewReview({ rating: 5, comment: '' });
      notify('Thank you for your feedback!', 'success');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  if (loading) return <Loader fullScreen />;
  if (!product) return <div className="p-40 text-center uppercase tracking-widest opacity-20 font-black">Product Not Found</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 animate-fade-in pb-40">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-32">
        <div className={`bg-slate-50 dark:bg-zinc-900 rounded-[48px] p-12 flex items-center justify-center border border-slate-100 dark:border-white/5 transition-all duration-1000 ${isOutOfStock ? 'grayscale opacity-70' : ''}`}>
           <img src={product.image} className="max-h-[480px] object-contain transition-transform hover:scale-105 duration-700" alt={product.name} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="mb-12">
            <span className="text-primary font-bold text-[11px] uppercase tracking-[0.4em] mb-4 block">Official Release</span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight leading-none">{product.name}</h1>
            <div className="flex items-center gap-6">
              <span className={`text-4xl md:text-5xl font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-950 dark:text-white'}`}>৳{product.price.toLocaleString()}</span>
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isOutOfStock ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>
          </div>
          
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/10 mb-12 shadow-inner">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Product Details</h5>
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-sm whitespace-pre-wrap">{product.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={addToCart} 
              disabled={isOutOfStock}
              className={`h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 active:scale-95'}`}
            >
              {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
            </button>
            <button 
              onClick={() => { if(!isOutOfStock) { addToCart(); navigate('/checkout'); } }} 
              disabled={isOutOfStock}
              className={`h-16 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isOutOfStock ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 hover:brightness-110'}`}
            >
              {isOutOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Related Section */}
      {related.length > 0 && (
        <section className="mb-32">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-2xl font-black uppercase tracking-tight">Similar Products</h3>
            <div className="h-px flex-1 bg-slate-100 dark:bg-white/5 ml-8"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="group p-5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-3xl hover:border-primary/40 transition-all">
                <div className={`aspect-square mb-6 bg-slate-50 dark:bg-black/20 rounded-2xl p-5 ${p.stock !== 'instock' ? 'grayscale opacity-50' : ''}`}>
                  <img src={p.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={p.name} />
                </div>
                <h4 className="font-bold text-[11px] uppercase truncate mb-2">{p.name}</h4>
                <p className="text-primary font-black text-sm">৳{p.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="border-t border-slate-100 dark:border-white/5 pt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-20">
          <h3 className="text-3xl font-black uppercase tracking-tighter">Customer Experiences</h3>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="flex text-gold text-lg">
              {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Genuine Feedback</span>
          </div>
        </div>

        {user && (
          <form onSubmit={submitReview} className="mb-24 space-y-8 max-w-3xl">
            <div className="flex items-center gap-6">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Rating</span>
               <div className="flex gap-2">
                 {[1,2,3,4,5].map(s => (
                   <button key={s} type="button" onClick={() => setNewReview({...newReview, rating: s})} className={`text-2xl transition-all ${newReview.rating >= s ? 'text-gold scale-110' : 'text-slate-200 hover:text-gold/50'}`}><i className="fas fa-star"></i></button>
                 ))}
               </div>
            </div>
            <textarea placeholder="Tell us about your purchase experience..." className="w-full h-36 p-6 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl outline-none font-medium text-sm focus:border-primary/40 transition-all" value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} />
            <button className="h-14 px-12 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Post Review</button>
          </form>
        )}

        <div className="space-y-12">
          {reviews.map(rev => (
            <div key={rev.id} className="pb-12 border-b border-slate-50 dark:border-white/5 flex gap-8 last:border-0">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(rev.userName)}&background=2e8b57&color=fff&bold=true`} className="w-14 h-14 rounded-2xl shadow-sm" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-black text-xs uppercase tracking-tight">{rev.userName}</h4>
                  <div className="flex text-gold text-[9px] gap-0.5">
                    {[...Array(5)].map((_, i) => <i key={i} className={`${rev.rating > i ? 'fas' : 'far'} fa-star`}></i>)}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-primary/10 pl-5">"{rev.comment}"</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
