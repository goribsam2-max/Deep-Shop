
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// Added 'where' to the firestore imports to fix the error on line 71
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { User, Notification } from './types';

// Views
import Home from './views/Home';
import ProductDetail from './views/ProductDetail';
import Cart from './views/Cart';
import Auth from './views/Auth';
import Profile from './views/Profile';
import Admin from './views/Admin';
import Checkout from './views/Checkout';
import SellPhone from './views/SellPhone';

// Components
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Loader from './components/Loader';
import GlobalNotification from './components/Notification';
import Sidebar from './components/Sidebar';

export const NotificationContext = React.createContext<{
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}>({ notify: () => {} });

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [globalNotify, setGlobalNotify] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error("Auth user document fetch error:", e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Separate effect for notification listener to avoid issues if rules are tight
  useEffect(() => {
    if (!user?.uid) {
      setHasUnread(false);
      return;
    }

    // Listener for user-specific notifications to update unread badge
    const qNotify = query(
      collection(db, 'users', user.uid, 'notifications'), 
      where('isRead', '==', false),
      limit(1)
    );
    
    const unsubscribeNotify = onSnapshot(qNotify, (snapshot) => {
      setHasUnread(!snapshot.empty);
    }, (err) => {
      console.debug("Unread notification listener error (expected if empty):", err);
    });

    return () => unsubscribeNotify();
  }, [user?.uid]);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setGlobalNotify({ msg, type });
  };

  if (loading) return <Loader fullScreen />;

  const isAuthPage = location.pathname === '/auth';

  return (
    <NotificationContext.Provider value={{ notify }}>
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors duration-500 overflow-x-hidden">
        {!isAuthPage && <Navbar user={user} onOpenMenu={() => setMenuOpen(true)} hasUnreadNotify={hasUnread} />}
        {!isAuthPage && <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} user={user} />}
        
        <main className="min-h-[80vh]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail user={user} />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout user={user} />} />
            <Route path="/sell-phone" element={<SellPhone user={user} />} />
            <Route path="/auth" element={user ? <Navigate to="/profile" /> : <Auth />} />
            <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/auth" />} />
            <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to="/" />} />
          </Routes>
        </main>

        {!isAuthPage && <BottomNav />}
        
        {globalNotify && (
          <GlobalNotification 
            message={globalNotify.msg} 
            type={globalNotify.type} 
            onClose={() => setGlobalNotify(null)} 
          />
        )}
      </div>
    </NotificationContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
