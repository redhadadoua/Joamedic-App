import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, MapPin, Banknote, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const ALGERIA_WILAYAS = [
  "1 - Adrar", "2 - Chlef", "3 - Laghouat", "4 - Oum El Bouaghi", "5 - Batna", 
  "6 - Béjaïa", "7 - Biskra", "8 - Béchar", "9 - Blida", "10 - Bouira", 
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou", 
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda", 
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine", 
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla", 
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès", 
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela", 
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma", 
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - Timimoun", "50 - Bordj Badji Mokhtar", 
  "51 - Ouled Djellal", "52 - Béni Abbès", "53 - In Salah", "54 - In Guezzam", "55 - Touggourt", 
  "56 - Djanet", "57 - El M'Ghair", "58 - El Meniaa"
];

export default function CheckoutModal() {
  const { t, language } = useLanguage();
  const { isCheckoutOpen, setIsCheckoutOpen, cartTotal, cartItems, clearCart } = useCart();
  const { user, signInWithGoogle } = useAuth();
  
  const [checkoutState, setCheckoutState] = useState<'form' | 'processing' | 'success'>('form');
  const [orderId, setOrderId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [shippingInfo, setShippingInfo] = useState({
    name: '', email: '', phone: '', wilaya: '', city: '', address: ''
  });

  const handleClose = () => {
    setIsCheckoutOpen(false);
    setTimeout(() => {
      setCheckoutState('form');
    }, 500);
  };

  const handleSuccessClose = () => {
    clearCart();
    handleClose();
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Checkout Google Sign-In failed:", err);
      let friendly = err.message || 'Google authentication failed.';
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked') || err.message?.includes('popup_blocked')) {
        friendly = language === 'AR'
          ? 'تم حظر النافذة المنبثقة لتسجيل الدخول بواسطة متصفحك. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في علامة تبويب جديدة.'
          : language === 'FR'
          ? 'La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les popups ou ouvrir l\'application dans un nouvel onglet.'
          : 'The login popup was blocked by your browser. Please allow popups or open the app in a new tab.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        friendly = language === 'AR'
          ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مجدداً.'
          : language === 'FR'
          ? 'La fenêtre de connexion a été fermée avant la fin. Veuillez réessayer.'
          : 'The login window was closed. Please click Google Sign-In and complete the login.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        friendly = 'The login request was cancelled. Please try again.';
      }
      setErrorMsg(friendly);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCheckoutState('processing');
    
    try {
      const generatedOrderId = `JM-${Math.floor(10000 + Math.random() * 90000)}`;
      const userId = user ? user.uid : 'guest';
      
      const orderData = {
        userId: userId,
        items: cartItems.map(item => ({ 
          id: item.id, 
          name: item.name, 
          quantity: item.quantity, 
          price: item.price, 
          size: item.size,
          personalization: item.personalization || null
        })),
        total: cartTotal,
        status: 'processing',
        shippingInfo: shippingInfo,
        createdAt: new Date().toISOString() // Use standard compatible timestamp for local structure
      };

      // Fetch Google Sheets Webhook URL first in the background
      let webAppUrl: string | null = null;
      try {
        const sheetsDoc = await getDoc(doc(db, 'settings', 'google_sheets'));
        if (sheetsDoc.exists()) {
          const sheetsData = sheetsDoc.data();
          webAppUrl = sheetsData.webAppUrl || null;
        }
      } catch (configErr) {
        console.warn("Could not load google sheets configuration:", configErr);
      }

      // Backup write to localStorage immediately so it is instantly available in order history regardless of latency
      const existingLocalOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
      const backupOrder = {
        id: generatedOrderId,
        ...orderData
      };
      if (!existingLocalOrders.some((o: any) => o.id === generatedOrderId)) {
        existingLocalOrders.push(backupOrder);
        localStorage.setItem('backup_orders', JSON.stringify(existingLocalOrders));
      }

      // Await Firestore document creation to guarantee security & absolute persistence on the server
      try {
        await setDoc(doc(db, 'orders', generatedOrderId), {
          ...orderData,
          createdAt: serverTimestamp() // Genuine Firestore serverTimestamp for db integrity
        });
      } catch (firestoreErr: any) {
        console.error("Firestore order placement error:", firestoreErr);
        setErrorMsg(
          language === 'AR' 
            ? 'فصل الاتصال أو خطأ في التسجيل بقاعدة البيانات. يرجى تكرار المحاولة.' 
            : language === 'FR'
            ? 'Erreur lors de la soumission de votre commande dans la base clinique. Veuillez réessayer.'
            : 'Error while registering your order in database. Please click Place Order again.'
        );
        setCheckoutState('form');
        return;
      }

      // If a Google Sheets webhook exists, append the order details immediately to Google Sheets
      if (webAppUrl) {
        try {
          const itemsDetail = cartItems.map((i: any) => 
            `${i.name} (Color: ${i.color || 'N/A'}, Size: ${i.size || 'N/A'}, Qty: ${i.quantity || 1})`
          ).join('; ');

          const addressParts = [];
          if (shippingInfo.address) addressParts.push(shippingInfo.address);
          if (shippingInfo.city) addressParts.push(shippingInfo.city);
          if (shippingInfo.wilaya) addressParts.push(shippingInfo.wilaya);
          const finalAddress = addressParts.join(', ');

          const newOrderRow = [
            generatedOrderId,
            shippingInfo.name || 'Guest Customer',
            shippingInfo.email || 'N/A',
            shippingInfo.phone || 'N/A',
            finalAddress,
            `${cartTotal} DA`,
            new Date().toLocaleString(),
            'processing',
            itemsDetail
          ];

          // Trigger append row to Google Sheet
          fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'add_order', data: [newOrderRow] })
          }).catch(webhookErr => {
            console.error("Delayed sheets webhook background trigger error:", webhookErr);
          });
        } catch (webhookErr) {
          console.error("Sheets webhook preparation error:", webhookErr);
        }
      }
      
      setOrderId(generatedOrderId);
      setCheckoutState('success');
    } catch (error) {
      console.error("Error creating order: ", error);
      setCheckoutState('form');
    }
  };

  if (!isCheckoutOpen && checkoutState === 'form') return null;

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={checkoutState === 'success' ? handleSuccessClose : handleClose}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="relative w-full max-w-2xl glass-panel shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            {checkoutState !== 'processing' && (
              <button
                onClick={checkoutState === 'success' ? handleSuccessClose : handleClose}
                className="absolute top-6 right-6 w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20"
              >
                <X size={18} />
              </button>
            )}

            <div className="overflow-y-auto overflow-x-hidden no-scrollbar">
              {checkoutState === 'form' && (
                <div className="p-8 pb-12">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                        {t('checkout.title')}
                      </h2>
                      <p className="text-white/50 text-sm mt-1">{cartItems.length} {t('orderStatus.items')} • {cartTotal} DA</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                    {errorMsg && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl p-4 flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-400 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                    {!user && (
                      <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex flex-col gap-3">
                        <p className="text-teal-200/90 text-sm">
                          {language === 'AR' 
                            ? 'يمكنك تسجيل الدخول لحفظ طلبك وتتبعه لاحقاً في حسابك، أو إكمال الطلب مباشرة كزائر!' 
                            : language === 'FR'
                            ? 'Connectez-vous pour enregistrer votre commande sur votre profil, ou continuez directement en tant qu\'invité !'
                            : 'Sign in with Google to save your order history in your profile, or place your order directly as a guest!'}
                        </p>
                        <button type="button" onClick={handleGoogleSignIn} className="glass-button bg-teal-400/20 border-teal-400/30 hover:bg-teal-400/30 text-white py-2 px-4 rounded-lg text-xs w-max transition-all">
                          {language === 'AR' ? 'تسجيل الدخول مع Google' : language === 'FR' ? 'Se connecter avec Google' : 'Sign In with Google'}
                        </button>
                      </div>
                    )}
                    {/* Shipping Info */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">{t('checkout.shipping')}</h3>
                        <MapPin size={18} className="text-white/30" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input required type="text" placeholder={t('checkout.name')} value={shippingInfo.name} onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors" />
                        <input required type="tel" placeholder={t('checkout.phone')} value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors" />
                        <select required value={shippingInfo.wilaya} onChange={e => setShippingInfo({...shippingInfo, wilaya: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors appearance-none cursor-pointer">
                          <option value="" disabled>{t('checkout.wilaya')}</option>
                          {ALGERIA_WILAYAS.map((wilaya) => (
                            <option key={wilaya} value={wilaya} className="bg-emerald-950 text-white">{wilaya}</option>
                          ))}
                        </select>
                        <input required type="text" placeholder={t('checkout.city')} value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors" />
                        <input required type="text" placeholder={t('checkout.address')} value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors sm:col-span-2" />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    {/* Payment Info */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-teal-400 uppercase tracking-wider">{t('checkout.payment')}</h3>
                        <Banknote size={18} className="text-teal-400" />
                      </div>
                      <div className="bg-teal-900/20 border border-teal-500/20 rounded-xl p-5 flex items-start gap-4">
                        <div className="mt-1 w-5 h-5 rounded-full border-4 border-teal-500 bg-emerald-950 flex-shrink-0"></div>
                        <div>
                          <p className="text-white font-medium">{t('checkout.cod')}</p>
                          <p className="text-white/60 text-sm mt-1">{t('checkout.codDesc')}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full mt-2 glass-button shine-effect bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 text-white font-medium py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.15)] focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-transparent"
                    >
                      {t('checkout.placeOrder')} - {cartTotal} DA
                    </button>
                  </form>
                </div>
              )}

              {checkoutState === 'processing' && (
                <div className="p-16 flex flex-col items-center justify-center min-h-[400px] gap-6">
                  <div className="relative w-20 h-20">
                     <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                     <div className="absolute inset-0 rounded-full border-2 border-teal-400 border-t-transparent animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-teal-400">
                       <ShieldCheck size={28} className="animate-pulse" />
                     </div>
                  </div>
                  <p className="text-teal-300 font-medium animate-pulse text-lg tracking-wide">{t('checkout.processing')}</p>
                </div>
              )}

              {checkoutState === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="p-10 flex flex-col items-center text-center min-h-[400px] justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 size={40} className="drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                  </motion.div>
                  
                  <h2 className="text-3xl font-display font-bold text-white mb-4">
                    {t('checkout.success')}
                  </h2>
                  <p className="text-white/60 mb-2">
                    {t('checkout.successDesc')}
                  </p>
                  <p className="text-teal-300 font-mono text-xl mb-10 tracking-widest bg-white/5 py-2 px-6 rounded-lg pointer-events-auto select-all">
                    {orderId}
                  </p>

                  <button 
                    onClick={handleSuccessClose}
                    className="w-full max-w-sm glass-button shine-effect bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-4 rounded-xl transition-all"
                  >
                    {t('checkout.continueShopping')}
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
