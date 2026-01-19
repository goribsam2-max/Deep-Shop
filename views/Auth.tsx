
import React, { useState, useContext } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../App';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      notify('Welcome back to Deep Shop!', 'success');
      navigate('/');
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return notify("Passwords do not match.", 'error');
    }
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const fullName = `${formData.firstName} ${formData.lastName}`;
      await updateProfile(user, { displayName: fullName });
      
      await setDoc(doc(db, 'users', user.uid), {
        name: fullName,
        email: formData.email,
        phone: formData.phone,
        isAdmin: false,
        rewardPoints: 0,
        createdAt: new Date().toISOString()
      });
      
      notify('Account created successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const progress = isLogin ? 100 : (step / 4) * 100;

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-black z-[60] flex flex-col p-6 animate-fade-in overflow-y-auto no-scrollbar">
      <div className="max-w-md w-full mx-auto my-auto py-10">
        <div className="mb-10">
          <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Deep Shop BD</span>
              <h1 className="text-3xl font-black tracking-tight leading-tight uppercase">
                {isLogin ? 'Login' : 'Signup'}
              </h1>
            </div>
            {!isLogin && (
              <span className="text-slate-400 text-[10px] font-black uppercase mb-1 tracking-widest">
                Step {step} / 4
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
            <div className="space-y-1.5 group">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-primary transition-colors">Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                placeholder="name@example.com"
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1.5 group">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-primary transition-colors">Security Password</label>
              <input
                type="password"
                name="password"
                required
                className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                placeholder="••••••••"
                onChange={handleChange}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] bg-primary text-white rounded-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 uppercase text-xs tracking-widest"
            >
              {loading ? <i className="fas fa-spinner animate-spin"></i> : (
                <>
                  <span>Proceed</span>
                  <i className="fas fa-arrow-right text-[10px]"></i>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                    placeholder="Tanvir"
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                    placeholder="Ahmed"
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mobile Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                  placeholder="01XXXXXXXXX"
                  onChange={handleChange}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                  placeholder="name@example.com"
                  onChange={handleChange}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                    placeholder="••••••••"
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Verify Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="w-full h-[50px] px-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                    placeholder="••••••••"
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="w-[50px] h-[50px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={step < 4 ? () => setStep(s => s + 1) : handleSignup}
                className="flex-1 h-[50px] bg-primary text-white rounded-xl font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all uppercase text-xs tracking-widest"
              >
                {loading ? <i className="fas fa-spinner animate-spin"></i> : (
                  <>
                    <span>{step < 4 ? 'Continue' : 'Start Shopping'}</span>
                    <i className="fas fa-arrow-right text-[10px]"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setStep(1); }}
            className="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto"
          >
            {isLogin ? "Join the community" : "Already a member? Login"}
          </button>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="mt-12 mx-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-slate-900 transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
          Back to storefront
        </button>
      </div>
    </div>
  );
};

export default Auth;
