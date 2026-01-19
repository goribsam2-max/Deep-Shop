
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import RankBadge from '../components/RankBadge';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'mobile', 'laptop', 'clothes', 'accessories'];

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
    <div className="animate-fade-in pb-32">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" 
            className="w-full h-full object-cover opacity-50" 
            alt="Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl animate-slide-up">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight uppercase">
            Deep Shop <span className="gradient-text">Premium</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-lg font-medium mb-10 max-w-xl mx-auto opacity-80 uppercase tracking-widest">
            The Ultimate Destination for Flagship Tech.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="h-[60px] px-10 bg-primary text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
              EXPLORE GEAR
            </button>
            <Link to="/sell-phone" className="h-[60px] px-10 glass text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all border-white/30 flex items-center justify-center">
              SELL DEVICE
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-10">
        {/* Category Nav */}
        <div className="flex gap-3 mb-12 overflow-x-auto no-scrollbar py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 h-[50px] rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm border ${
                activeCategory === cat 
                  ? 'bg-primary text-white border-primary scale-105' 
                  : 'glass text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Global Catalog */}
        <div className="mb-20">
          {loading ? <Loader /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {filteredProducts.map((product, index) => (
                <div key={product.id} className={`${index % 2 === 1 ? 'translate-y-4 md:translate-y-0' : ''}`}>
                   <ProductCard product={product} />
                </div>
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
  const isPreOrder = stockStr === 'preorder';

  return (
    <Link 
      to={`/product/${product.id}`}
      className="group flex flex-col glass rounded-[28px] overflow-hidden transition-all duration-500 hover:-translate-y-2 border-white/20 h-full shadow-sm hover:shadow-2xl"
    >
      <div className="aspect-square overflow-hidden relative bg-white flex items-center justify-center p-0.5">
        <img 
          src={product.image || 'https://picsum.photos/600/600'} 
          alt={product.name} 
          className="w-[90%] h-[90%] object-contain group-hover:scale-110 transition-transform duration-700"
        />
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="text-white font-black text-[10px] uppercase tracking-widest border-2 border-white/30 px-4 py-2 rounded-xl">
              Out of Stock
            </span>
          </div>
        )}
        {isPreOrder && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="bg-accent text-white font-black text-[8px] uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl">
              Pre-Order
            </span>
          </div>
        )}
      </div>
      
      <div className="p-5 flex flex-col h-full bg-slate-50/50 dark:bg-transparent">
        <h3 className="font-extrabold text-[16px] md:text-lg mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors uppercase tracking-tight">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">৳{product.price.toLocaleString()}</span>
          <button className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isOutOfStock ? 'bg-slate-200 text-slate-400' : 'bg-primary text-white shadow-xl active:scale-90 hover:brightness-110'}`}>
            <i className={`fas ${isOutOfStock ? 'fa-lock' : 'fa-plus'} text-sm`}></i>
          </button>
        </div>
      </div>
    </Link>
  );
}

export default Home;
