import React, { useState, useEffect, useContext, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import { User, Chat, Story, UserNote } from '../types';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Loader from '../components/Loader';
import { NotificationContext } from '../App';

const IMGBB_API_KEY = '31505ba1cbfd565b7218c0f8a8421a7e';

const Messages: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const { notify } = useContext(NotificationContext);
  const [chats, setChats] = useState<Chat[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinnedChats, setPinnedChats] = useState<string[]>(JSON.parse(localStorage.getItem('pinned_chats') || '[]'));
  
  const [storyEditor, setStoryEditor] = useState<{ 
    active: boolean, 
    image: string | null,
    text: string,
    color: string,
    size: number,
    yPos: number 
  }>({ active: false, image: null, text: '', color: '#ffffff', size: 24, yPos: 50 });
  
  const [publishingStory, setPublishingStory] = useState(false);

  useEffect(() => {
    const chatQuery = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const storyQuery = query(collection(db, 'stories'));
    const noteQuery = query(collection(db, 'notes'));

    const unsubChats = onSnapshot(chatQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
      docs.sort((a, b) => {
        const aPinned = pinnedChats.includes(a.id);
        const bPinned = pinnedChats.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0);
      });
      setChats(docs);
      setLoading(false);
    });

    const unsubStories = onSnapshot(storyQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      setStories(docs);
    });

    const unsubNotes = onSnapshot(noteQuery, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserNote));
      setNotes(docs);
    });

    return () => { unsubChats(); unsubStories(); unsubNotes(); };
  }, [user.uid, pinnedChats]);

  const handlePublishStory = async () => {
    if (!storyEditor.image) return;
    setPublishingStory(true);
    notify('স্টোরি পাবলিশ হচ্ছে...', 'info');
    try {
      const blob = await (await fetch(storyEditor.image)).blob();
      const formData = new FormData();
      formData.append('image', blob);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.success) {
        await addDoc(collection(db, 'stories'), {
          userId: user.uid,
          userName: user.name,
          userPic: user.profilePic || '',
          image: data.data.url,
          text: storyEditor.text,
          textColor: storyEditor.color,
          textSize: storyEditor.size,
          textY: storyEditor.yPos,
          timestamp: serverTimestamp(),
          reactions: {}
        });
        notify('স্টোরি পাবলিশ হয়েছে!', 'success');
        setStoryEditor({ active: false, image: null, text: '', color: '#ffffff', size: 24, yPos: 50 });
      }
    } catch (e) { notify('ব্যর্থ হয়েছে', 'error'); }
    finally { setPublishingStory(false); }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#050505] animate-fade-in pb-32 overflow-x-hidden relative">
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden shrink-0"><img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full object-cover" alt="" /></div>
              <h1 className="text-xl font-black uppercase brand-font italic tracking-tight">ইনবক্স <span className="text-primary">মেসেজ</span></h1>
           </div>
           <button onClick={() => navigate('/explore')} className="w-10 h-10 rounded-full bg-white dark:bg-white/5 flex items-center justify-center text-slate-500 shadow-sm"><i className="fas fa-search"></i></button>
        </div>

        {/* Stories Horizontal Scroller */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 items-start h-[120px]">
           <div className="flex flex-col items-center gap-2 shrink-0 w-20">
              <div className="relative">
                 <div className="w-16 h-16 rounded-full p-1 border-2 border-dashed border-primary">
                   <img src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=fff&bold=true`} className="w-full h-full rounded-full object-cover" alt="" />
                 </div>
                 <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white dark:border-black cursor-pointer shadow-lg">
                   <i className="fas fa-plus"></i>
                   <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => setStoryEditor({ ...storyEditor, active: true, image: ev.target?.result as string }); reader.readAsDataURL(file); }}} />
                 </label>
              </div>
              <span className="text-[8px] font-black uppercase text-slate-400">স্টোরি</span>
           </div>

           {stories.map(story => (
              <div key={story.id} className="relative shrink-0 w-20">
                <Link to={`/story/${story.id}`} className="flex flex-col items-center gap-2">
                   <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-primary to-amber-500 shadow-lg">
                     <img src={story.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.userName)}`} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black" alt="" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-slate-400 truncate w-full text-center">{story.userName}</span>
                </Link>
              </div>
           ))}
        </div>
      </div>

      {/* Chat List Area */}
      <div className="flex-1 px-4 space-y-2 mt-4 relative z-10 w-full">
        {chats.map(chat => {
          const isGroup = !!chat.isGroup;
          const otherId = isGroup ? null : chat.participants.find(p => p !== user.uid) || '';
          const otherUser = isGroup ? { name: chat.groupName, pic: chat.groupPic } : chat.participantData[otherId!];
          const unread = chat.unreadCount?.[user.uid] || 0;
          const isPinned = pinnedChats.includes(chat.id);
          
          return (
            <Link key={chat.id} to={`/chat/${chat.id}`} className={`flex items-center gap-4 p-5 rounded-[28px] transition-all border ${isPinned ? 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10' : 'hover:bg-white dark:hover:bg-white/5 border-transparent shadow-sm'}`}>
              <div className="relative shrink-0">
                 <img src={otherUser.pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}`} className="w-14 h-14 rounded-full object-cover shadow-md" alt="" />
                 {isPinned && <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[8px] border-2 border-white dark:border-black shadow-lg"><i className="fas fa-thumbtack"></i></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-[13px] font-black uppercase truncate brand-font ${unread > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{otherUser.name}</h4>
                <p className={`text-[11px] truncate mt-0.5 ${unread > 0 ? 'font-black text-slate-800 dark:text-white' : 'text-slate-400'}`}>{chat.lastMessage}</p>
              </div>
              {unread > 0 && <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-primary/20">{unread}</div>}
            </Link>
          );
        })}
      </div>

      {/* Advanced Story Editor Modal */}
      {storyEditor.active && (
        <div className="fixed inset-0 z-[8000] bg-black flex flex-col animate-fade-in overflow-hidden">
           {/* Header Controls */}
           <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-30">
              <button onClick={() => setStoryEditor({ ...storyEditor, active: false, image: null })} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-90 transition-all">
                <i className="fas fa-times"></i>
              </button>
              <h3 className="text-white text-xs font-black uppercase tracking-widest brand-font">Create Story</h3>
              <button onClick={handlePublishStory} disabled={publishingStory} className="h-10 px-8 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-90 transition-all disabled:opacity-50">
                {publishingStory ? 'Wait...' : 'Publish'}
              </button>
           </div>

           {/* Preview Container - Real-time Preview */}
           <div className="flex-1 relative flex items-center justify-center p-4">
              <div className="relative w-full h-full max-w-[420px] max-h-[750px] bg-zinc-900 rounded-[44px] overflow-hidden shadow-2xl border border-white/10">
                 <img src={storyEditor.image!} className="w-full h-full object-cover" alt="Story preview" />
                 
                 {/* Positionable Text Element */}
                 {storyEditor.text && (
                   <div 
                    className="absolute left-0 right-0 px-10 text-center transition-all duration-100 pointer-events-none"
                    style={{ top: `${storyEditor.yPos}%`, transform: 'translateY(-50%)' }}
                   >
                     <p 
                      className="font-black uppercase brand-font break-words drop-shadow-lg"
                      style={{ color: storyEditor.color, fontSize: `${storyEditor.size}px`, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                     >
                        {storyEditor.text}
                     </p>
                   </div>
                 )}
              </div>
           </div>

           {/* Editor Tools Panel */}
           <div className="p-8 bg-black/90 backdrop-blur-2xl space-y-8 animate-slide-up border-t border-white/5">
              <div className="space-y-4">
                 <input 
                  placeholder="টেক্সট যোগ করুন..." 
                  className="w-full h-14 bg-white/10 rounded-2xl px-6 text-white text-sm font-bold outline-none border border-white/10 focus:border-primary transition-all"
                  value={storyEditor.text}
                  onChange={e => setStoryEditor({ ...storyEditor, text: e.target.value })}
                 />
                 
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                       {['#ffffff', '#e11d48', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#000000'].map(c => (
                         <button 
                          key={c} 
                          onClick={() => setStoryEditor({ ...storyEditor, color: c })}
                          className={`w-9 h-9 rounded-full border-2 shrink-0 transition-all ${storyEditor.color === c ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                         />
                       ))}
                    </div>
                    <div className="h-10 w-px bg-white/10 shrink-0"></div>
                    <div className="flex-1 flex flex-col gap-1.5">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Text Size</span>
                       <input type="range" min="14" max="50" value={storyEditor.size} onChange={e => setStoryEditor({ ...storyEditor, size: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Position (Y-Axis)</span>
                    <input type="range" min="10" max="90" value={storyEditor.yPos} onChange={e => setStoryEditor({ ...storyEditor, yPos: parseInt(e.target.value) })} className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary" />
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
