
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
  const [currentSlider, setCurrentSlider] = useState(0);
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
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlider(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  if (loading) return <Loader fullScreen />;

  const adsTop = ads.filter(ad => ad.placement === 'home_top');
  const adsMiddle = ads.filter(ad => ad.placement === 'home_middle');
  const adsBottom = ads.filter(ad => ad.placement === 'home_bottom');

  return (
    <div className="animate-fade-in pb-40">
      {siteConfig?.bannerVisible && (
        <div className="bg-primary text-white py-4 text-center text-[12px] font-black px-4 shadow-xl sticky top-20 z-50 mb-10 tracking-widest uppercase flex items-center justify-center gap-3">
          <i className="fas fa-bullhorn animate-pulse"></i> {siteConfig.bannerText}
        </div>
      )}

      {/* HD Slider Section */}
      {banners.length > 0 && (
        <section className={`relative w-full overflow-hidden max-w-[96%] mx-auto ${siteConfig?.bannerVisible ? 'mt-4' : 'mt-10'}`}>
          <div 
            className="flex transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{ transform: `translateX(-${currentSlider * 100}%)` }}
          >
            {banners.map((b) => (
              <div 
                key={b.id} 
                onClick={() => b.link && window.open(b.link, '_blank')} 
                className="w-full shrink-0 flex items-center justify-center cursor-pointer rounded-[40px] overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl border border-white/10"
              >
                <img 
                  src={b.imageUrl} 
                  className="w-full h-auto block" 
                  alt="Slider"
                  style={{ imageRendering: 'high-quality' }}
                />
              </div>
            ))}
          </div>
          
          {banners.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
              {banners.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentSlider(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlider ? 'w-10 bg-primary shadow-lg shadow-primary/40' : 'w-2 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-16">
        
        {/* Top Ads Area */}
        {adsTop.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {adsTop.map(ad => <AdComponent key={ad.id} ad={ad} />)}
          </div>
        )}

        {promoted.length > 0 && (
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12 px-2">
               <h2 className="text-2xl font-black uppercase tracking-tight brand-font italic">DEEP <span className="text-primary">DEALS</span></h2>
               <div className="h-[2px] flex-1 bg-slate-100 dark:bg-white/5 mx-6"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {promoted.map(p => <ProductCard key={p.id} product={p} isVipAd />)}
            </div>
          </section>
        )}

        {/* Middle Ads Area */}
        {adsMiddle.length > 0 && (
          <div className="grid grid-cols-1 gap-10 mb-24">
            {adsMiddle.map(ad => <AdComponent key={ad.id} ad={ad} isLarge />)}
          </div>
        )}

        <section className="mb-24">
           <div className="flex items-center justify-between mb-12 px-2">
              <h2 className="text-2xl font-black uppercase tracking-tight brand-font italic">LATEST <span className="text-slate-400">STOCK</span></h2>
              <div className="h-[2px] flex-1 bg-slate-100 dark:bg-white/5 mx-6"></div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Bottom Ads Area */}
        {adsBottom.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            {adsBottom.map(ad => <AdComponent key={ad.id} ad={ad} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const AdComponent: React.FC<{ ad: CustomAd, isLarge?: boolean }> = ({ ad, isLarge }) => (
  <div 
    onClick={() => ad.link && window.open(ad.link, '_blank')}
    className="relative group w-full bg-white dark:bg-zinc-950 rounded-[44px] overflow-hidden border-2 border-slate-100 dark:border-white/5 shadow-2xl cursor-pointer hover:border-primary/40 transition-all duration-700"
  >
    {/* AD Identifier */}
    <div className="absolute top-6 left-6 z-10 flex gap-2">
       <div className="bg-primary text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg tracking-widest border border-white/20">
         SPONSORED
       </div>
       <div className="bg-black/60 backdrop-blur-md text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg tracking-widest border border-white/10">
         AD
       </div>
    </div>
    
    <div className="overflow-hidden bg-slate-50 dark:bg-black/20">
      <img 
        src={ad.imageUrl} 
        className="w-full h-auto block group-hover:scale-105 transition-transform duration-1000" 
        alt={ad.text} 
        style={{ imageRendering: 'high-quality' }} 
      />
    </div>

    {ad.text && (
      <div className="p-8 bg-white dark:bg-zinc-900 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
        <div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">প্রোমোশন</p>
           <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{ad.text}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
          <i className="fas fa-external-link-alt text-xs"></i>
        </div>
      </div>
    )}
  </div>
);

const ProductCard: React.FC<{ product: Product, isVipAd?: boolean }> = ({ product, isVipAd }) => {
  return (
    <Link to={`/product/${product.id}`} className="group flex flex-col bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-2xl relative h-full shadow-sm">
      {isVipAd && (
        <div className="absolute top-4 left-4 z-10">
           <span className="bg-primary text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">HOT</span>
        </div>
      )}
      <div className={`aspect-square p-8 bg-slate-50 dark:bg-black/10 relative flex items-center justify-center overflow-hidden ${product.stock !== 'instock' ? 'grayscale opacity-60' : ''}`}>
        <img src={product.image.split(',')[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={product.name} />
      </div>
      <div className="p-8 flex flex-col flex-1">
        <h3 className="font-bold text-[12px] mb-4 line-clamp-2 uppercase tracking-tight leading-snug text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-lg font-black text-slate-900 dark:text-white brand-font">৳{product.price.toLocaleString()}</span>
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
             <i className="fas fa-arrow-right text-[10px]"></i>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default Home;
