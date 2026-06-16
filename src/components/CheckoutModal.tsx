import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, MapPin, Banknote, CheckCircle2, User, AlertCircle, ShoppingBag, Phone, Home } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { wilayas, getCommunesByWilayaId } from 'algeria-locations';

export default function CheckoutModal() {
  const { t, language } = useLanguage();
  const { isCheckoutOpen, setIsCheckoutOpen, cartTotal, cartItems, clearCart, placeOrder } = useCart();
  const { user, signInWithGoogle } = useAuth();
  
  const [checkoutState, setCheckoutState] = useState<'form' | 'processing' | 'success'>('form');
  const [orderId, setOrderId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<string>('preparing');
  const [progressMessage, setProgressMessage] = useState<string>('');

  const getProgressLabel = (step: string) => {
    switch (step) {
      case 'preparing':
        return 'جاري إعداد وتحليل بيانات طلبك الطبي...';
      case 'fetching_config':
        return 'جاري جلب إعدادات المزامنة النشطة...';
      case 'verifying_internet':
        return 'جاري التحقق من مسار الاتصال بالإنترنت...';
      case 'verifying_firestore':
        return 'جاري اختبار الاتصال بقاعدة البيانات الآمنة (Firestore)...';
      case 'verifying_sheets':
        return 'جاري اختبار وصول سجل مبيعات Google Sheets...';
      case 'connection_verified':
        return 'تم تأكيد سلامة قنوات الاتصال بنجاح!';
      case 'local_backup':
        return 'جاري حفظ نسخة احتياطية محلية في المتصفح...';
      case 'firestore':
        return 'جاري نقل وتأمين الطلب في قاعدة البيانات السحابية (Firestore)...';
      case 'google_sheets':
        return 'جاري مزامنة وتوثيق الطلب في سجل Google Sheets الإداري...';
      case 'done':
        return 'تم تأكيد طلبك العيادي وتوثيقه بنجاح!';
      default:
        return progressMessage || 'جاري معالجة وتأكيد طلبك الطبي...';
    }
  };

  const [shippingInfo, setShippingInfo] = useState({
    name: '', email: '', phone: '', wilaya: '', city: '', address: ''
  });
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | ''>('');
  const [communes, setCommunes] = useState<{id: number, name: string}[]>([]);

  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wilayaId = parseInt(e.target.value, 10);
    const wilayaObj = wilayas.find((w: any) => w.id === wilayaId);
    if (!wilayaObj) return;

    setSelectedWilayaId(wilayaId);
    setCommunes(getCommunesByWilayaId(wilayaId));
    setShippingInfo({
      ...shippingInfo, 
      wilaya: `${wilayaObj.code} - ${wilayaObj.name}`, 
      city: '' // reset city 
    });
  };

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
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        friendly = 'تم حظر النافذة المنبثقة لتسجيل الدخول بواسطة متصفحك. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في علامة تبويب جديدة.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        friendly = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مجدداً.';
      }
      setErrorMsg(friendly);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCheckoutState('processing');
    setProgressStep('preparing');
    setProgressMessage('Preparing active clinical data structure...');
    
    try {
      const userId = user ? user.uid : 'guest';
      const generatedOrderId = await placeOrder(shippingInfo, userId, (step, msg) => {
        setProgressStep(step);
        if (msg) setProgressMessage(msg);
      });
      
      setOrderId(generatedOrderId);
      setCheckoutState('success');
    } catch (error: any) {
      console.error("Error creating order: ", error);
      setErrorMsg(`عذراً! واجهنا خطأ أثناء معالجة طلبك الطبي. يرجى التحقق من اتصال الشبكة وإعادة المحاولة.`);
      setCheckoutState('form');
    }
  };

  if (!isCheckoutOpen && checkoutState === 'form') return null;

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 select-none leading-normal">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={checkoutState === 'success' ? handleSuccessClose : handleClose}
            className="absolute inset-0 bg-emerald-950/85 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            className="relative w-full max-w-4xl glass-panel shadow-2xl flex flex-col overflow-hidden max-h-[95vh] rounded-[2rem] border border-white/10"
          >
            {checkoutState !== 'processing' && (
              <button
                onClick={checkoutState === 'success' ? handleSuccessClose : handleClose}
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 hover:scale-105 flex items-center justify-center text-white/80 hover:text-white transition-all z-20"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}

            <div className="overflow-y-auto no-scrollbar">
              {checkoutState === 'form' && (
                <div className="grid grid-cols-1 md:grid-cols-12">
                  
                  {/* Left Column: Order Sumary Review (Desktop only or top) */}
                  <div className="md:col-span-5 p-6 bg-slate-950/40 border-b md:border-b-0 md:border-l border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <ShoppingBag className="text-teal-400" size={18} />
                        <h2 className="text-xs font-bold text-white/50 uppercase tracking-widest">مراجعة المشتريات • Order Summary</h2>
                      </div>

                      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 no-scrollbar">
                        {cartItems.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                            <img src={item.image} alt={item.name} className="w-12 h-16 object-cover rounded-md" />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white text-xs font-bold truncate">{item.name}</h3>
                              <p className="text-[11px] text-white/60 mt-0.5">اللون: {item.color}</p>
                              <p className="text-[11px] text-white/60">المقاس: {item.size || 'M'}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-teal-300 text-xs font-semibold">{item.price}</span>
                                <span className="text-[11px] text-white/40">الكمية: {item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/15 space-y-3 font-sans">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>المجموع الفرعي:</span>
                        <span>{cartTotal} DA</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>الشحن والوصول:</span>
                        <span className="text-teal-400">مجاني • Complimentary</span>
                      </div>
                      <div className="h-[1px] bg-white/10 w-full my-2"></div>
                      <div className="flex justify-between text-sm font-bold text-white">
                        <span>المبلغ الإجمالي الكلي:</span>
                        <span className="text-lg text-teal-300">{cartTotal} DA</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Checkout Form */}
                  <div className="md:col-span-7 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-semibold text-white tracking-tight">
                          إتمام الشراء الآمن
                        </h2>
                        <p className="text-white/40 text-xs mt-0.5">تعبئة البيانات مخصصة لخدمة التوصيل السريع</p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl p-4 flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-400 shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {!user && (
                        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex flex-col gap-3">
                          <p className="text-teal-200/95 text-xs">
                            يمكنك تسجيل الدخول لحفظ وتتبع سجل طلبك تلقائياً في ثوانٍ، أو إتمام الطلب مباشرة كزائر!
                          </p>
                          <button type="button" onClick={handleGoogleSignIn} className="glass-button bg-teal-400/20 border-teal-400/30 hover:bg-teal-400/30 text-white py-1.5 px-4 rounded-lg text-xs w-max transition-all">
                            تسجيل الدخول مع Google
                          </button>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">بيانات الشحن والتوصيل</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative flex items-center">
                            <span className="absolute left-4 text-white/30"><User size={16} /></span>
                            <input required type="text" placeholder="الاسم الكامل" value={shippingInfo.name} onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 transition-all font-sans" />
                          </div>

                          <div className="relative flex items-center">
                            <span className="absolute left-4 text-white/30"><Phone size={16} /></span>
                            <input required type="tel" pattern="[0-9]*" onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} placeholder="رقم الهاتف" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 transition-all font-sans" />
                          </div>

                          <select required value={selectedWilayaId} onChange={handleWilayaChange} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colours appearance-none cursor-pointer">
                            <option value="" disabled>اختر الولاية</option>
                            {wilayas.map((w: any) => (
                              <option key={w.id} value={w.id} className="bg-emerald-950 text-white">{w.code} - {w.name}</option>
                            ))}
                          </select>

                          <select required value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} disabled={!selectedWilayaId} className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-teal-400/50 transition-colours appearance-none cursor-pointer disabled:opacity-40">
                            <option value="" disabled>اختر البلدية</option>
                            {communes.map((c: any) => (
                              <option key={c.id} value={c.name} className="bg-emerald-950 text-white">{c.name}</option>
                            ))}
                          </select>

                          <div className="relative flex items-center sm:col-span-2">
                            <span className="absolute left-4 text-white/30"><Home size={16} /></span>
                            <input required type="text" placeholder="عنوان الشحن بالتفصيل (الحي، المجموعة أو الشارع)" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50 transition-all font-sans" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">طريقة الدفع</h3>
                        <div className="bg-teal-950/30 border border-teal-500/20 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                          <div className="mt-1 w-5 h-5 rounded-full border-[5px] border-teal-400 bg-emerald-950 flex-shrink-0"></div>
                          <div>
                            <p className="text-white text-sm font-bold">الدفع نقداً عند الاستلام (COD)</p>
                            <p className="text-white/50 text-xs mt-1">يرجى توفير قيمة الطلب نقداً عند وصول مندوب التوصيل لمقر عملكم أو عيادتكم.</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-teal-500/30 to-emerald-500/30 border border-teal-400/40 hover:from-teal-500/40 hover:to-emerald-500/40 text-teal-200 font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.15)] focus:outline-none flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                      >
                        تأكيد الطلب الطبي - {cartTotal} DA
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {checkoutState === 'processing' && (
                <div className="p-16 flex flex-col items-center justify-center min-h-[450px] gap-6">
                  <div className="relative w-24 h-24">
                     <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                     <div className="absolute inset-0 rounded-full border-4 border-teal-400 border-t-transparent animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-teal-400">
                       <ShieldCheck size={36} className="animate-pulse" />
                     </div>
                  </div>
                  <div className="text-center space-y-3 max-w-sm">
                    <p className="text-teal-300 font-bold text-lg tracking-wide animate-pulse">
                      {getProgressLabel(progressStep)}
                    </p>
                    <p className="text-white/35 text-[11px] leading-relaxed">يرجى الانتظار بينما نقوم بحفظ طلبك وتوثيقه في السحابة وسجلات العمل...</p>
                  </div>
                </div>
              )}

              {checkoutState === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.96 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="p-12 flex flex-col items-center text-center min-h-[450px] justify-center"
                >
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                    className="w-24 h-24 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6 border border-teal-500/20"
                  >
                    <CheckCircle2 size={48} className="drop-shadow-[0_0_15px_rgba(45,212,191,0.4)]" />
                  </motion.div>
                  
                  <h2 className="text-3xl font-display font-extrabold text-white mb-3">
                    تم تأكيد طلبك بنجاح!
                  </h2>
                  <p className="text-white/60 mb-6 max-w-md text-sm leading-relaxed">
                    شكراً لشرائك من جوامديك. لقد تم إرسال وسيردك اتصال هاتفي من فريق الدعم لتأكيد الشحن الفوري. رقم طلبك الإداري الفريد للتتبع:
                  </p>
                  <p className="text-teal-300 font-mono text-2xl mb-12 tracking-widest bg-white/5 py-3 px-8 rounded-2xl border border-white/5 pointer-events-auto select-all shadow-inner">
                    {orderId}
                  </p>

                  <button 
                    onClick={handleSuccessClose}
                    className="w-full max-w-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all"
                  >
                    متابعة العرض والتسوق
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
