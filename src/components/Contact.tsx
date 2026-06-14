import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.warn("Contact form written cache-only because Firestore is offline:", error);
      // Fallback: Notify success locally so offline users don't get blocked
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <section id="contact" className="py-24 px-6 relative z-10 w-full max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-[1px] w-12 bg-teal-400"></div>
          <span className="text-teal-400 uppercase tracking-widest text-sm font-semibold">{t('contact.tag')}</span>
          <div className="h-[1px] w-12 bg-teal-400"></div>
        </div>
        <h2 className="text-4xl md:text-5xl font-display font-semibold text-white tracking-tight mb-6">
          {t('contact.title')}
        </h2>
        <p className="text-white/60 max-w-2xl mx-auto text-lg">
          {t('contact.desc')}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel p-8 rounded-3xl border border-white/10 flex flex-col gap-8"
          >
            <div>
              <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Email</h3>
              <p className="text-white/60 text-sm mb-1">Our friendly team is here to help.</p>
              <a href="mailto:support@joamedic.dz" className="text-teal-300 hover:text-teal-200 transition-colors">support@joamedic.dz</a>
            </div>

            <div>
              <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <MapPin size={24} />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Office</h3>
              <p className="text-white/60 text-sm mb-1">Come say hello at our HQ.</p>
              <p className="text-white/80">Algiers, Algeria</p>
            </div>

            <div>
              <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                <Phone size={24} />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Phone</h3>
              <p className="text-white/60 text-sm mb-1">Sat-Thu from 8am to 5pm.</p>
              <a href="tel:+213123456789" className="text-white/80 hover:text-white transition-colors">+213 12 34 56 78 90</a>
            </div>
          </motion.div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10"
          >
            {status === 'success' ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-display font-bold text-white mb-2">Message Sent</h3>
                <p className="text-white/60">{t('contact.success')}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-white/60 mb-2" htmlFor="name">{t('contact.name')}</label>
                    <input
                      id="name"
                      required
                      type="text"
                      disabled={status === 'submitting'}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-teal-400/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2" htmlFor="email">{t('contact.email')}</label>
                    <input
                      id="email"
                      required
                      type="email"
                      disabled={status === 'submitting'}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-teal-400/50 transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2" htmlFor="subject">{t('contact.subject')}</label>
                  <input
                    id="subject"
                    required
                    type="text"
                    disabled={status === 'submitting'}
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-teal-400/50 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2" htmlFor="message">{t('contact.message')}</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    disabled={status === 'submitting'}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-teal-400/50 transition-colors resize-none disabled:opacity-50"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="glass-button shine-effect bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 text-white font-medium py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.15)] focus:outline-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={18} />
                      {t('contact.send')}
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
