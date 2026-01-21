
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, SiteConfig } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [promoted, setPromoted] = useState<Product[]>([]);
  const [trending, setTrending] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeConfig = onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
    });

    const q = query(collection(db, 'products'), orderBy('timestamp', 'desc'));
    const unsubscribeProds = onSnapshot(q, (snapshot) => {
      const allProds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(allProds);
      setPromoted(allProds.filter(p => p.isPromoted));
      setNewArrivals(allProds.slice(0, 8));
      const trend = [...allProds].sort((a, b) => (b.views || 0) - (a.views || 0));
      setTrending(trend.slice(0, 4));
      setLoading(false);
    });

    return () => { unsubscribeConfig(); unsubscribeProds(); };
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="animate-fade-in pb-32 bg-white dark:bg-black">
      {siteConfig?.bannerVisible && (
        <div className="bg-primary text-white py-2 text-center text-[10px] font-bold uppercase tracking-widest px-4">
          {siteConfig.bannerText}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative h-[70vh] md:h-[85vh] flex items-center px-6 md:px-24 bg-white dark:bg-black overflow-hidden border-b border-slate-100 dark:border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(225,29,72,0.06),transparent_50%)]"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-full bg-primary/5 blur-[120px] rounded-full"></div>
        </div>
        
        <div className="max-w-5xl relative z-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-primary font-black text-[9px] uppercase tracking-[0.3em]">Authorized Gadget Store</span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter leading-[0.85] uppercase">
            Pure <br/>Tech <span className="text-primary italic">Power.</span>
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-lg font-medium mb-12 leading-relaxed">
            The ultimate collection of premium gadgets in Bangladesh. We provide 100% original products with official warranty support.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => navigate('/explore')}
              className="w-full sm:w-80 h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_40px_-10px_rgba(225,29,72,0.5)] flex items-center justify-center gap-3 group"
            >
              <span>Explore Collection</span>
              <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-16">
        
        {/* Trust Badges */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
          <div className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl shrink-0"><i className="fas fa-truck-fast"></i></div>
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-tight">Fast Delivery</h4>
              <p className="text-[9px] text-slate-400 uppercase font-bold">Dhaka & Nationwide</p>
            </div>
          </div>
          <div className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl shrink-0"><i className="fas fa-shield-check"></i></div>
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-tight">100% Original</h4>
              <p className="text-[9px] text-slate-400 uppercase font-bold">Direct Import</p>
            </div>
          </div>
          <div className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl shrink-0"><i className="fas fa-headset"></i></div>
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-tight">Expert Support</h4>
              <p className="text-[9px] text-slate-400 uppercase font-bold">24/7 Assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-5 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl shrink-0"><i className="fas fa-hand-holding-dollar"></i></div>
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-tight">Best Price</h4>
              <p className="text-[9px] text-slate-400 uppercase font-bold">Competitive Rate</p>
            </div>
          </div>
        </div>

        {/* Featured Items */}
        {promoted.length > 0 && (
          <section className="mb-32 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Editor's Picks</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Specially curated for you</p>
              </div>
              <Link to="/explore" className="text-primary font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity">Show All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {promoted.map(p => (
                <ProductCard key={p.id} product={p} isAd />
              ))}
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section className="mb-32">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Popular Items</h2>
            <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
              <i className="fas fa-fire text-primary text-xs"></i>
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">Hot Sales</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trending.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Banner Section */}
        <section className="bg-slate-900 dark:bg-white/5 rounded-[40px] p-8 md:p-20 relative overflow-hidden mb-32">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(225,29,72,0.12),transparent_50%)]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12 text-center md:text-left">
            <div className="flex-1">
              <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
                Sell <br/><span className="text-primary">Old Devices</span> <br/>Easily.
              </h2>
              <p className="text-slate-400 text-lg mb-12 max-w-md mx-auto md:mx-0">Upgrade your lifestyle today. Sell your used gadgets at the best market value.</p>
              <Link to="/sell-phone" className="inline-flex h-14 px-12 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest items-center hover:scale-105 transition-all shadow-xl">
                Get Quote Now
              </Link>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <img src="https://i.ibb.co.com/Gf5Sd3Dr/IMG-2561.png" className="w-full max-w-sm animate-float" alt="Gadget Banner" />
            </div>
          </div>
        </section>

        {/* Main Store */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Our Store</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High-end hardware collection</p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {['All', 'mobile', 'laptop', 'accessories'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`whitespace-nowrap px-8 h-12 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all border ${
                    activeCategory === cat 
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' 
                      : 'bg-white dark:bg-white/5 text-slate-500 border-slate-100 dark:border-white/5 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? <Loader /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-20 text-center">
            <button 
              onClick={() => navigate('/explore')}
              className="w-full sm:w-80 h-16 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] flex items-center justify-center gap-3 group mx-auto"
            >
              <span>See All Products</span>
              <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
            </button>
          </div>
        </section>

        {/* Newsletter / Stats */}
        <section className="bg-slate-50 dark:bg-zinc-900/50 rounded-[40px] p-10 md:p-20 flex flex-col lg:flex-row items-center justify-between gap-12 border border-slate-100 dark:border-white/5">
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">Stay Notified</h3>
            <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto lg:mx-0">Join our newsletter and get exclusive flash sale updates directly to your inbox.</p>
            <form className="flex gap-2 max-w-md mx-auto lg:mx-0" onSubmit={e => e.preventDefault()}>
               <input type="email" placeholder="Email address" className="flex-1 h-14 px-6 bg-white dark:bg-black/40 rounded-2xl outline-none font-bold text-sm border border-slate-200 dark:border-white/10" />
               <button className="h-14 px-8 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Join</button>
            </form>
          </div>
          <div className="grid grid-cols-2 gap-8 shrink-0">
             <div className="text-center lg:text-left">
               <h4 className="text-4xl font-black text-primary mb-1">15K+</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Happy Customers</p>
             </div>
             <div className="text-center lg:text-left">
               <h4 className="text-4xl font-black text-primary mb-1">5.0</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Rating</p>
             </div>
             <div className="text-center lg:text-left">
               <h4 className="text-4xl font-black text-primary mb-1">24H</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rapid Response</p>
             </div>
             <div className="text-center lg:text-left">
               <h4 className="text-4xl font-black text-primary mb-1">100%</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Original Product</p>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product, isAd?: boolean }> = ({ product, isAd }) => {
  const isOutOfStock = product.stock !== 'instock';
  const firstName = product.mentionedUserName ? product.mentionedUserName.split(' ')[0] : null;

  return (
    <Link 
      to={`/product/${product.id}`}
      className={`group flex flex-col bg-white dark:bg-zinc-900 border ${isAd ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-100 dark:border-white/5'} rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl h-full relative`}
    >
      {isAd && (
        <div className="absolute top-5 left-5 z-10">
          <span className="bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">AD</span>
        </div>
      )}

      <div className={`aspect-square relative flex items-center justify-center p-8 bg-slate-50 dark:bg-black/20 overflow-hidden ${isOutOfStock ? 'grayscale opacity-60' : ''}`}>
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
            <span className="bg-white/90 dark:bg-black/80 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-slate-100 dark:border-white/10">Sold Out</span>
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col h-full">
        <h3 className="font-bold text-[13px] mb-4 line-clamp-2 uppercase tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors leading-snug">
          {product.name}
        </h3>
        
        {firstName && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-900 dark:text-white">{firstName}</span>
            <div className="h-1 w-1 rounded-full bg-slate-300"></div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary">RECOMMENDED</span>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {product.oldPrice && <span className="text-[9px] text-slate-400 line-through font-bold mb-1">৳{product.oldPrice.toLocaleString()}</span>}
            <span className={`text-base font-black ${isOutOfStock ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              ৳{product.price.toLocaleString()}
            </span>
          </div>
          {!isOutOfStock && (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <i className="fas fa-plus text-[10px]"></i>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default Home;
