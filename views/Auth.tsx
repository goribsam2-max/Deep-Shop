
import React, { useState, useContext, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../App';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
      notify('আবারও স্বাগতম!', 'success');
      navigate('/');
    } catch (error: any) {
      notify('ইমেইল বা পাসওয়ার্ড ভুল।', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return notify("পাসওয়ার্ড মিলছে না।", 'error');
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
      
      notify('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!', 'success');
      navigate('/');
    } catch (error: any) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const progress = isLogin ? 100 : (step / 4) * 100;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black z-[60] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-100 dark:bg-primary/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className={`max-w-md w-full relative z-10 transition-all duration-1000 ease-out transform ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-primary/30 animate-bounce">
            <img src="https://i.ibb.co.com/cKknZQx1/IMG-2179.jpg" className="w-10 h-10 rounded-lg invert brightness-200" alt="Logo" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
            {isLogin ? 'আবারও স্বাগতম' : 'নতুন অ্যাকাউন্ট'}
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">অফিসিয়াল গ্যাজেট স্টোর</p>
        </div>

        {!isLogin && (
          <div className="mb-10 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold uppercase text-primary">রেজিস্ট্রেশন প্রগ্রেস</span>
              <span className="text-[11px] font-bold text-slate-400">ধাপ {step} (মোট ৪)</span>
            </div>
            <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-primary transition-all duration-700 ease-ios" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        <div className="bg-slate-50/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-slate-100 dark:border-white/5 p-8 rounded-[40px] shadow-2xl">
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 pl-1">ইমেইল এড্রেস</label>
                <input type="email" name="email" required className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="আপনার ইমেইল" onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-400 pl-1">পাসওয়ার্ড</label>
                <input type="password" name="password" required className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="পাসওয়ার্ড দিন" onChange={handleChange} />
              </div>
              <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white rounded-2xl font-bold shadow-xl uppercase text-xs">
                {loading ? <i className="fas fa-spinner animate-spin"></i> : 'লগইন করুন'}
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {step === 1 && (
                <div className="space-y-6 animate-slide-up">
                  <input type="text" name="firstName" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="নামের প্রথম অংশ" onChange={handleChange} />
                  <input type="text" name="lastName" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="নামের শেষ অংশ" onChange={handleChange} />
                </div>
              )}
              {step === 2 && (
                <input type="tel" name="phone" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="মোবাইল নম্বর" onChange={handleChange} />
              )}
              {step === 3 && (
                <input type="email" name="email" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="ইমেইল এড্রেস" onChange={handleChange} />
              )}
              {step === 4 && (
                <div className="space-y-6 animate-slide-up">
                  <input type="password" name="password" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="পাসওয়ার্ড তৈরি করুন" onChange={handleChange} />
                  <input type="password" name="confirmPassword" className="w-full h-14 px-6 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl outline-none font-bold text-sm" placeholder="পাসওয়ার্ড নিশ্চিত করুন" onChange={handleChange} />
                </div>
              )}
              <div className="flex gap-3">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(s => s - 1)} className="w-14 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center"><i className="fas fa-chevron-left text-xs"></i></button>
                )}
                <button type="button" disabled={loading} onClick={step < 4 ? () => setStep(s => s + 1) : handleSignup} className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold uppercase text-xs">
                  {loading ? <i className="fas fa-spinner animate-spin"></i> : (step < 4 ? 'পরবর্তী ধাপ' : 'অ্যাকাউন্ট তৈরি করুন')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setStep(1); }} className="text-[11px] font-bold text-slate-400 hover:text-primary transition-all uppercase">
            {isLogin ? "নতুন? অ্যাকাউন্ট তৈরি করুন" : "অ্যাকাউন্ট আছে? লগইন করুন"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
