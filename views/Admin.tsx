
import React, { useState, useEffect, useContext } from 'react';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, addDoc, serverTimestamp, orderBy, where, deleteDoc } from 'firebase/firestore';
import { Order, Product, OrderStatus, SellerRank, User } from '../types';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users' | 'notify'>('orders');
  const { notify } = useContext(NotificationContext);

  // Form states
  const [searchEmail, setSearchEmail] = useState('');
  const [notifTargetEmail, setNotifTargetEmail] = useState('');
  const [notifData, setNotifData] = useState({ title: '', message: '', imageUrl: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ name: '', price: 0, category: 'mobile' as any, image: '', description: '', stock: 'instock' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('timestamp', 'desc')));
        setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } else if (activeTab === 'products') {
        const productsSnap = await getDocs(collection(db, 'products'));
        setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } else if (activeTab === 'users') {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
      }
    } catch (err: any) {
      console.error(err);
      notify('Permission Denied: Please use Admin account.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productForm);
        notify('Product details updated', 'success');
      } else {
        await addDoc(collection(db, 'products'), { ...productForm, timestamp: serverTimestamp() });
        notify('New product launched successfully', 'success');
      }
      setEditingProduct(null);
      setProductForm({ name: '', price: 0, category: 'mobile', image: '', description: '', stock: 'instock' });
      fetchData();
    } catch (err: any) { notify(err.message, 'error'); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      notify('Product erased from inventory', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const sendDirectNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userQ = query(collection(db, 'users'), where('email', '==', notifTargetEmail));
      const userSnap = await getDocs(userQ);
      if (userSnap.empty) return notify('Target user not found', 'error');
      
      const targetUserId = userSnap.docs[0].id;
      await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
        ...notifData,
        isRead: false,
        timestamp: serverTimestamp()
      });
      notify('Direct notification pushed', 'success');
      setNotifData({ title: '', message: '', imageUrl: '' });
      setNotifTargetEmail('');
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const toggleBan = async (user: User) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBanned: !user.isBanned });
      notify(`User ${user.isBanned ? 'Restored' : 'Banned'} Successfully`, 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  const updateRank = async (userId: string, rank: SellerRank) => {
    try {
      await updateDoc(doc(db, 'users', userId), { rankOverride: rank });
      notify('User rank manually updated', 'success');
      fetchData();
    } catch (e: any) { notify(e.message, 'error'); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <h1 className="text-3xl font-black uppercase tracking-tighter">DEEP COMMAND</h1>
        <div className="flex flex-wrap p-1.5 glass rounded-xl gap-1.5 shadow-inner border border-white/20">
          {['orders', 'products', 'users', 'notify'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 h-[40px] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="animate-fade-in pb-40">
          {activeTab === 'orders' ? (
             <div className="glass rounded-[24px] overflow-hidden shadow-xl border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 border-b border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <tr><th className="p-6">Order ID</th><th className="p-6">Buyer</th><th className="p-6">Value</th><th className="p-6">State</th><th className="p-6 text-right">Process</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-bold">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          <td className="p-6 text-primary">#{order.id.substring(0,8)}</td>
                          <td className="p-6">{order.userInfo?.userName}</td>
                          <td className="p-6">৳{order.totalAmount}</td>
                          <td className="p-6">
                            <span className="px-3 py-1 rounded-full text-[8px] uppercase font-black tracking-widest bg-primary/10 text-primary">{order.status}</span>
                          </td>
                          <td className="p-6 text-right">
                            <select 
                              value={order.status}
                              onChange={async (e) => { await updateDoc(doc(db, 'orders', order.id), { status: e.target.value }); fetchData(); }}
                              className="bg-white dark:bg-black border border-slate-200 rounded-lg p-1 text-[9px] font-black uppercase"
                            >
                              <option value="pending">Pending</option>
                              <option value="packaging">Packaging</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="canceled">Canceled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          ) : activeTab === 'products' ? (
            <div className="grid lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5">
                <form onSubmit={saveProduct} className="glass p-8 rounded-[32px] space-y-5 shadow-xl sticky top-24 border-white/40">
                  <h3 className="text-xl font-black mb-4 uppercase">Stock Editor</h3>
                  <input placeholder="Product Name" className="w-full h-[50px] px-6 bg-slate-50 rounded-xl border border-white/10" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Price (৳)" className="h-[50px] px-6 bg-slate-50 rounded-xl" value={productForm.price || ''} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} required />
                    <select className="h-[50px] px-6 bg-slate-50 rounded-xl font-bold" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})}>
                      <option value="instock">In Stock</option>
                      <option value="outofstock">Out of Stock</option>
                      <option value="preorder">Pre-Order</option>
                    </select>
                  </div>
                  <input placeholder="Image URL" className="w-full h-[50px] px-6 bg-slate-50 rounded-xl" value={productForm.image} onChange={e => setProductForm({...productForm, image: e.target.value})} required />
                  <textarea placeholder="Description" className="w-full p-6 bg-slate-50 rounded-xl h-32 text-xs" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} required />
                  <button className="w-full h-[50px] bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg">
                    {editingProduct ? 'Update Stock' : 'Add Item'}
                  </button>
                  {editingProduct && <button type="button" onClick={() => setEditingProduct(null)} className="w-full text-danger font-black text-[10px] uppercase">Cancel</button>}
                </form>
              </div>
              <div className="lg:col-span-7 space-y-4">
                 {products.map(p => (
                   <div key={p.id} className="glass p-5 rounded-[24px] flex gap-5 items-center">
                      <img src={p.image} className="w-16 h-16 rounded-xl object-contain bg-white" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{p.name}</h4>
                        <p className="text-primary font-black text-xs">৳{p.price}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingProduct(p); setProductForm(p as any); }} className="w-10 h-10 glass rounded-lg text-accent"><i className="fas fa-edit"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 glass rounded-lg text-danger"><i className="fas fa-trash"></i></button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          ) : activeTab === 'users' ? (
             <div className="space-y-8">
                <input placeholder="Search users..." className="w-full max-w-md h-[50px] px-6 glass rounded-xl" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => u.email.includes(searchEmail)).map(u => (
                    <div key={u.uid} className="glass p-6 rounded-[24px] border-white/20">
                       <h4 className="font-black text-lg mb-4">{u.name}</h4>
                       <p className="text-[10px] font-black text-slate-400 mb-6 uppercase">{u.email}</p>
                       <button 
                         onClick={() => toggleBan(u)}
                         className={`w-full h-[45px] rounded-xl font-black text-[10px] uppercase tracking-widest ${u.isBanned ? 'bg-success text-white' : 'bg-danger text-white'}`}
                       >
                          {u.isBanned ? 'Unban' : 'Ban'}
                       </button>
                    </div>
                  ))}
                </div>
             </div>
          ) : (
             <form onSubmit={sendDirectNotification} className="max-w-xl mx-auto glass p-10 rounded-[32px] space-y-6">
                <h3 className="text-xl font-black uppercase">Push Broadcast</h3>
                <input placeholder="Recipient Email" className="w-full h-[50px] px-6 glass rounded-xl" value={notifTargetEmail} onChange={e => setNotifTargetEmail(e.target.value)} required />
                <input placeholder="Alert Title" className="w-full h-[50px] px-6 glass rounded-xl uppercase font-black" value={notifData.title} onChange={e => setNotifData({...notifData, title: e.target.value})} required />
                <textarea placeholder="Message..." className="w-full p-6 glass rounded-xl h-40 text-xs" value={notifData.message} onChange={e => setNotifData({...notifData, message: e.target.value})} required />
                <button className="w-full h-[50px] bg-primary text-white rounded-xl font-black uppercase tracking-widest text-xs">Dispatch Alert</button>
             </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;
