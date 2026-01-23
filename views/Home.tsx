
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product, SiteConfig, HomeBanner, CustomAd } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [promoted, setPromoted] = useState<Product[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [ads, setAds] = useState<CustomAd[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onSnapshot(doc(db, 'site_config', 'global'), (snap) => {
      if (snap.exists()) setSiteConfig(snap.data() as SiteConfig);
    });

    onSnapshot(query(collection(db, 'banners'), orderBy('order', 'asc')), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeBanner)));
    });

    onSnapshot(query(collection(db, 'ads'), orderBy('order', 'asc')), (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomAd)));
    });

    const unsubProds = onSnapshot(query(collection(db, 'products'), orderBy('timestamp', 'desc')), (snapshot) => {
      const allProds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(allProds);
      setPromoted(allProds.filter(p => p.isPromoted));
      setLoading(false);
    });

    return () => unsubProds();
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="animate-fade-in pb-40">
      {siteConfig?.bannerVisible && (
        <div className="bg-primary text-white py-2.5 text-center text-[11px] font-bold px-4 shadow-lg sticky top-20 z-50">
          {siteConfig.bannerText}
        </div>
      )}

      {banners.length > 0 && (
        <section className="relative h-[25vh] md:h-[50vh] w-full overflow-hidden bg-slate-100 dark:bg-zinc-900 mt-6 mb-12 rounded-[32px] max-w-[96%] mx-auto border border-white dark:border-white/5">
          {banners.map((b, idx) => (
            <div key={b.id} onClick={() => b.link && window.open(b.link, '_blank')} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer ${idx === currentBanner ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <img src={b.imageUrl} className="w-full h-full object-cover" alt="Banner" />
            </div>
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === currentBanner ? 'w-10 bg-white' : 'w-4 bg-white/30'}`}></div>
            ))}
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-12">
        {promoted.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12 px-2">
               <h2 className="text-2xl font-black uppercase tracking-tighter brand-font italic">DEEP <span className="text-primary">DEALS</span></h2>
               <span className="text-[11px] font-bold bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">স্পেশাল অফার</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {promoted.map(p => <ProductCard key={p.id} product={p} isVipAd />)}
            </div>
          </section>
        )}

        <section className="mb-24">
           <div className="flex items-center justify-between mb-12 px-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter brand-font italic">LATEST <span className="text-slate-400">STOCK</span></h2>
              <div className="h-0.5 flex-1 bg-slate-100 dark:bg-white/5 mx-6 hidden md:block"></div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product, isVipAd?: boolean }> = ({ product, isVipAd }) => {
  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl relative h-full">
      {isVipAd && (
        <div className="absolute top-4 left-4 z-10">
           <span className="bg-primary text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">OFFER</span>
        </div>
      )}
      <div className={`aspect-square p-10 bg-slate-50 dark:bg-black/10 relative flex items-center justify-center overflow-hidden ${product.stock !== 'instock' ? 'grayscale opacity-60' : ''}`}>
        <img src={product.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={product.name} />
      </div>
      <div className="p-8 flex flex-col flex-1">
        <h3 className="font-bold text-[13px] mb-4 line-clamp-2 uppercase tracking-tight leading-snug text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-black text-slate-900 dark:text-white brand-font">৳{product.price.toLocaleString()}</span>
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
             <i className="fas fa-plus text-[10px]"></i>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default Home;
