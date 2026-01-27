import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc, addDoc, collection, serverTimestamp, getDoc, increment } from 'firebase/firestore';
import { User, Story } from '../types';
import Loader from '../components/Loader';

const StoryViewer: React.FC<{ user: User }> = ({ user }) => {
  const { storyId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId) return;
    const unsub = onSnapshot(doc(db, 'stories', storyId), (snap) => {
      if (snap.exists()) setStory({ id: snap.id, ...snap.data() } as Story);
      setLoading(false);
    });
    return () => unsub();
  }, [storyId]);

  const handleReply = async () => {
    if (!reply.trim() || !story) return;
    if (user.uid === story.userId) return;

    const chatId = [user.uid, story.userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    
    try {
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, story.userId],
          participantData: {
            [user.uid]: { name: user.name, pic: user.profilePic || '' },
            [story.userId]: { name: story.userName, pic: story.userPic || '' }
          },
          lastMessage: `📷 Story Reply: ${reply}`,
          lastMessageTime: serverTimestamp(),
          unreadCount: { [story.userId]: 1, [user.uid]: 0 }
        });
      } else {
        await setDoc(chatRef, {
          lastMessage: `📷 Story Reply: ${reply}`,
          lastMessageTime: serverTimestamp(),
          [`unreadCount.${story.userId}`]: increment(1)
        }, { merge: true });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: user.name,
        text: `রিপ্লাই টু স্টোরি: ${reply}`,
        images: [story.image],
        timestamp: serverTimestamp()
      });

      setReply('');
      navigate(`/chat/${chatId}`);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!story) return <div className="p-40 text-center text-white bg-black">স্টোরি পাওয়া যায়নি</div>;

  return (
    <div className="fixed inset-0 z-[4000] bg-black flex flex-col animate-fade-in overflow-hidden">
       <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
             <img src={story.userPic || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.userName)}`} className="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg" alt="" />
             <h4 className="text-white text-xs font-black uppercase tracking-tight">{story.userName}</h4>
          </div>
          <button onClick={() => navigate('/messages')} className="text-white text-xl p-2"><i className="fas fa-times"></i></button>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-[420px] aspect-[9/16] bg-zinc-900 rounded-[44px] overflow-hidden shadow-2xl border border-white/5">
             <img src={story.image} className="w-full h-full object-cover" alt="" />
             {story.text && (
               <div 
                className="absolute left-0 right-0 px-8 text-center pointer-events-none"
                style={{ top: `${story.textY || 50}%`, transform: 'translateY(-50%)' }}
               >
                 <p 
                  className="font-black uppercase brand-font break-words"
                  style={{ color: story.textColor || '#ffffff', fontSize: `${story.textSize || 16}px` }}
                 >
                   {story.text}
                 </p>
               </div>
             )}
          </div>
       </div>

       <div className="p-6 space-y-6 bg-gradient-to-t from-black via-black/60 to-transparent pb-10">
          <div className="flex justify-around items-center max-w-sm mx-auto">
             {['❤️', '😂', '🔥', '😡', '👍'].map(emo => (
               <button key={emo} onClick={async () => {
                 const current = story.reactions || {};
                 current[user.uid] = emo;
                 await setDoc(doc(db, 'stories', storyId!), { reactions: current }, { merge: true });
               }} className={`text-2xl active:scale-150 transition-all ${story.reactions?.[user.uid] === emo ? 'grayscale-0' : 'grayscale opacity-60'}`}>{emo}</button>
             ))}
          </div>
          <div className="flex items-center gap-3 max-w-md mx-auto">
             <input placeholder="রিপ্লাই দিন..." className="flex-1 h-12 bg-white/10 border border-white/10 rounded-2xl px-5 text-white text-xs outline-none focus:border-primary/50" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReply()} />
             <button onClick={handleReply} className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-xl shrink-0"><i className="fas fa-paper-plane text-sm"></i></button>
          </div>
       </div>
    </div>
  );
};

export default StoryViewer;
