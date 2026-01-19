
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'mobile', 'laptop', 'accessories'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(prods);
      } catch (e) {
        console.error("Home fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="animate-fade-in pb-16">
      {/* Hero Section - Minimalist */}
      <section className="relative h-[45vh] flex items-center justify-start overflow-hidden bg-slate-950 px-6 md:px-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1616410011236-7a42121dd981?q=80&w=2000" 
            className="w-full h-full object-cover grayscale opacity-30" 
            alt="Hero"
          />
        </div>

        <div className="relative z-20 max-w-2xl animate-slide-up">
          <span className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Official Flagship Store</span>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight uppercase">
            Elevate Your <br/><span className="text-slate-500">Hardware.</span>
          </h1>
          <div className="flex gap-4">
            <button className="h-[52px] px-10 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-md">
              Shop Now
            </button>
            <Link to="/sell-phone" className="h-[52px] px-10 border border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center">
              Sell Device
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-10">
        {/* Category Nav - Clean Flat Style */}
        <div className="flex gap-3 mb-12 overflow-x-auto no-scrollbar py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 h-[42px] rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${
                activeCategory === cat 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Global Catalog */}
        <div>
          {loading ? <Loader /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const stockStr = (product.stock || '').toLowerCase().replace(/\s/g, '');
  const isOutOfStock = stockStr === 'outofstock';

  return (
    <Link 
      to={`/product/${product.id}`}
      className="group flex flex-col bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30 h-full"
    >
      <div className="aspect-square overflow-hidden relative bg-white flex items-center justify-center p-6">
        <img 
          src={product.image || 'https://picsum.photos/600/600'} 
          alt={product.name} 
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/90 dark:bg-black/90 flex items-center justify-center z-10">
            <span className="text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 border border-slate-900/20 dark:border-white/20 rounded-lg">Sold Out</span>
          </div>
        )}
      </div>
      
      <div className="p-5 flex flex-col h-full border-t border-slate-50 dark:border-white/5">
        <h3 className="font-bold text-sm mb-3 line-clamp-2 leading-snug text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-black text-slate-950 dark:text-white">৳{product.price.toLocaleString()}</span>
          <span className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
            <i className="fas fa-plus text-[10px]"></i>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default Home;
