
import React from 'react';

const Footer: React.FC = () => {
  const socialLinks = [
    { icon: 'fa-tiktok', label: 'TikTok', color: 'hover:text-pink-500', link: 'https://tiktok.com/@deepshopbd' },
    { icon: 'fa-facebook', label: 'Facebook', color: 'hover:text-blue-600', link: 'https://facebook.com/deepshopbd' },
    { icon: 'fa-youtube', label: 'YouTube', color: 'hover:text-red-600', link: 'https://youtube.com/@deepshopbd' },
    { icon: 'fa-telegram', label: 'Channel', color: 'hover:text-sky-500', link: 'https://t.me/deepshopbd' },
    { icon: 'fa-paper-plane', label: 'Inquiry', color: 'hover:text-sky-400', link: 'https://t.me/deepshop_admin' },
    { icon: 'fa-whatsapp', label: 'WhatsApp', color: 'hover:text-green-500', link: 'https://wa.me/8801700000000' },
  ];

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-white/10 glass pt-16 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-gem"></i>
              </div>
              <span className="text-2xl font-black tracking-tighter gradient-text">DEEP SHOP</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
              Bangladesh's most trusted premium gadget destination. Experience technology like never before with verified quality and local warranty support.
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a 
                  key={social.label}
                  href={social.link}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-10 h-10 glass rounded-full flex items-center justify-center text-slate-400 ${social.color} transition-all duration-300 hover:scale-110 shadow-sm`}
                  title={social.label}
                >
                  <i className={`fab ${social.icon} text-lg`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">Services</h4>
            <ul className="space-y-4 font-semibold text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Sell Your Device</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Exchange Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Warranty Check</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Join Community</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold mb-6 text-sm uppercase tracking-widest text-slate-400">Support</h4>
            <ul className="space-y-4 font-semibold text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Track Order</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Use</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <p>© 2024 DEEP SHOP BANGLADESH. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><i className="fas fa-shield-alt text-success"></i> Secured Payment</span>
            <span className="flex items-center gap-2"><i className="fas fa-truck text-accent"></i> Dhaka Wide Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
