import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Package, LogOut, Clock, ChevronDown, ChevronUp, 
  Truck, CheckCircle2, ShieldAlert, Award, Camera, Check, 
  Upload, Mail, Lock, Phone, Eye, EyeOff, CheckCircle
} from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, getDocsFromCache, orderBy } from 'firebase/firestore';
import { useLanguage } from '../i18n/LanguageContext';

export default function ProfileModal({ isOpen, onClose, onOpenAdmin }: { isOpen: boolean, onClose: () => void, onOpenAdmin?: () => void }) {
  const { user, userProfile, signUp, signIn, updateUserProfile, signInWithGoogle, logout } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Auth form states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // State alerts
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [showOperationNotAllowedGuide, setShowOperationNotAllowedGuide] = useState(false);

  // Profile Customization state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Verification state machine
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const AVATAR_PRESETS = [
    { name: 'Teal Scrub Clara', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Clara' },
    { name: 'Blue Scrub Marcus', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus' },
    { name: 'Emerald Scrub Sarah', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah' },
    { name: 'Slate Scrub James', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=James' },
    { name: 'Purple Scrub Karim', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Karim' },
    { name: 'Indigo Scrub Sofia', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sofia' },
    { name: 'Clinical Liam', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Liam' },
    { name: 'Aesthetic Emily', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emily' },
    { name: 'Professional Amina', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Amina' }
  ];

  const handleOpenAdmin = () => {
    onClose();
    if (onOpenAdmin) onOpenAdmin();
  };

  const getOrderDateString = (createdAt: any) => {
    if (!createdAt) return new Date().toLocaleDateString();
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    }
    const parsed = Date.parse(createdAt);
    if (!isNaN(parsed)) {
      return new Date(parsed).toLocaleDateString();
    }
    return new Date().toLocaleDateString();
  };

  useEffect(() => {
    if (user && isOpen) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        const fetchedMap = new Map<string, any>();

        // Step 1: Pre-load offline/backup orders from localStorage
        try {
          const backupOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
          const userBackupOrders = backupOrders.filter((o: any) => o.userId === user.uid);
          userBackupOrders.forEach((o: any) => fetchedMap.set(o.id, o));
        } catch (storageErr) {
          console.warn("Could not read local backup orders", storageErr);
        }

        try {
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          
          // Step 2: Retrieve instantly from Offline Cache
          try {
            const cacheSnapshot = await getDocsFromCache(q);
            if (cacheSnapshot && !cacheSnapshot.empty) {
              cacheSnapshot.docs.forEach(docSnap => {
                fetchedMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
              });
              setOrders(Array.from(fetchedMap.values()));
            }
          } catch (cacheErr) {
            console.log("No orders found in local cache:", cacheErr);
          }

          // Step 3: Run fast race to fetch latest orders from Server
          const timeoutPromise = new Promise<any>((resolve) => 
            setTimeout(() => resolve(null), 1500)
          );

          const serverSnapshot = await Promise.race([
            getDocs(q),
            timeoutPromise
          ]);

          if (serverSnapshot && !serverSnapshot.empty) {
            serverSnapshot.docs.forEach(docSnap => {
              fetchedMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
            });
          }

          const sortedResult = Array.from(fetchedMap.values()).sort((a, b) => {
            const getMs = (val: any) => {
              if (!val) return Date.now();
              if (typeof val.toDate === 'function') return val.toDate().getTime();
              if (val.seconds) return val.seconds * 1000;
              const p = Date.parse(val);
              return isNaN(p) ? Date.now() : p;
            };
            return getMs(b.createdAt) - getMs(a.createdAt);
          });
          
          setOrders(sortedResult);
        } catch (error) {
          console.warn("Error resolving online orders:", error);
          setOrders(Array.from(fetchedMap.values()));
        } finally {
          setLoadingOrders(false);
        }
      };
      
      fetchOrders();

      // Synthesize initial profile form fields
      if (userProfile) {
        setEditName(userProfile.displayName || user.displayName || '');
        setEditPhone(userProfile.phoneNumber || '');
      }
    }
  }, [user, userProfile, isOpen]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmittingAuth(false);

    if (!email || !password) {
      setAuthError('Please fill in all security credentials.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      if (authMode === 'signin') {
        await signIn(email, password);
        setAuthSuccess('تم تسجيل الدخول بنجاح! جاري تحضير المتجر...');
        setTimeout(() => {
          setAuthSuccess('');
          onClose();
        }, 1200);
      } else {
        if (!displayName.trim()) {
          throw new Error('الرجاء إدخال اسمك الكامل لتسجيل حسابك الرعاية.');
        }
        if (!phoneNumber.trim()) {
          throw new Error('الرجاء إدخال رقم هاتفك لتلقي إشعارات التوصيل السريع.');
        }
        await signUp(email, password, displayName.trim(), phoneNumber.trim());
        setAuthSuccess('تم إنشاء حسابك الجديد بنجاح! جاري توجيهك...');
        setTimeout(() => {
          setAuthSuccess('');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'فشلت عملية التحقق الأمينة. يرجى مراجعة إدخالاتك.';
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('auth/operation-not-allowed')) || (err.message && err.message.includes('operation-not-allowed'))) {
        setShowOperationNotAllowedGuide(true);
        friendlyMessage = 'شكل الاتصال غير مفعل: يرجى تفعيل الدخول البريدي في لوحة معلومات السحابة.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = 'إن هذا البريد الإلكتروني مسجل مسبقاً في نظام جواميديك.';
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = 'تحذير أمني: يرجى كتابة كلمة مرور حماية قوية من 6 أحرف على الأقل.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || (err.message && err.message.includes('invalid-credential'))) {
        friendlyMessage = 'بيانات التحقق غير مطابقة للسجلات الطبية. يرجى إعادة مراجعة بريدك الإلكتروني أو كلمة المرور.';
      }
      setAuthError(friendlyMessage);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthSuccess('');
    try {
      await signInWithGoogle();
      setAuthSuccess('تم تسجيل الدخول الآمن مع Google بنجاح!');
      setTimeout(() => {
        setAuthSuccess('');
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Google SSO Failure:", err);
      let friendly = err.message || 'فشلت بوابة Google الأمنية.';
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked') || err.message?.includes('popup_blocked')) {
        friendly = 'تم حظر نافذة التسجيل بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة لإتمام العملية.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        friendly = 'تم إلغاء النافذة المنبثقة من قبل المستخدم.';
      }
      setAuthError(friendly);
    }
  };

  const handleProfileSave = async () => {
    setAuthError('');
    setAuthSuccess('');
    
    if (!editName.trim()) {
      setAuthError("Profile name cannot be blank.");
      return;
    }

    try {
      const isPhoneChanged = editPhone.trim() !== (userProfile?.phoneNumber || '');
      await updateUserProfile({
        displayName: editName.trim(),
        phoneNumber: editPhone.trim(),
        // If they key in a fresh phone number, reset verified marker
        ...(isPhoneChanged ? { phoneVerified: false } : {})
      });
      setIsEditingProfile(false);
      setAuthSuccess("Clinical credentials updated successfully!");
      setTimeout(() => setAuthSuccess(''), 3000);
    } catch (err: any) {
      setAuthError(err.message || "Failed updating medical registry.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAuthError("Profile asset must be smaller than 2MB.");
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateUserProfile({ photoURL: base64String });
        setAuthSuccess("Medical badge graphic updated successfully.");
        setTimeout(() => setAuthSuccess(''), 3000);
      } catch (err) {
        console.error("Base64 upload failed:", err);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectAvatarPreset = async (url: string) => {
    try {
      await updateUserProfile({ photoURL: url });
      setShowAvatarSelector(false);
      setAuthSuccess("Avatar changed!");
      setTimeout(() => setAuthSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerPhoneVerification = () => {
    const currentNumber = isEditingProfile ? editPhone : (userProfile?.phoneNumber || '');
    if (!currentNumber || currentNumber.trim().length < 7) {
      alert("Please key in a valid telephone number first.");
      return;
    }

    // Standard high-reliability mock pin generator
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setVerificationCode(code);
    setVerificationInput('');
    setVerificationError('');
    setShowVerificationModal(true);
  };

  const submitPhoneVerification = async () => {
    if (verificationInput.trim() === verificationCode) {
      const confirmedNumber = isEditingProfile ? editPhone : (userProfile?.phoneNumber || '');
      
      await updateUserProfile({
        phoneNumber: confirmedNumber,
        phoneVerified: true
      });

      setShowVerificationModal(false);
      setVerificationCode('');
      setVerificationInput('');
      setAuthSuccess("Security check complete: Telephone verified!");
      setTimeout(() => setAuthSuccess(''), 4000);
    } else {
      setVerificationError("Verification PIN mismatch. Please check your simulated SMS.");
    }
  };

  const getStatusLevel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      case 'completed': return 3;
      default: return 1;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
            id="profile-modal-backdrop"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="relative w-full max-w-lg glass-panel shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            id="profile-modal-container"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20"
              id="profile-modal-close-btn"
            >
              <X size={18} />
            </button>

            <div className="overflow-y-auto overflow-x-hidden no-scrollbar p-6 sm:p-8 pb-12" id="profile-modal-scroll-area">
              {/* Alert Notifications */}
              <AnimatePresence>
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 mb-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
                  >
                    <ShieldAlert size={16} className="shrink-0" />
                    <span>{authError}</span>
                  </motion.div>
                )}
                {authSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 mb-4 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{authSuccess}</span>
                  </motion.div>
                )}
                {showOperationNotAllowedGuide && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-3"
                    id="firebase-auth-provider-guide"
                  >
                    <div className="flex items-center gap-2 font-bold mb-1 text-amber-300">
                      <ShieldAlert size={16} className="text-amber-400 shrink-0 animate-pulse" />
                      <span>Action Required: Enable Email Providers</span>
                    </div>
                    <p className="text-white/70 text-[11px] leading-relaxed">
                      Your Firebase project does not have the <strong>Email/Password</strong> authentication provider turned on yet. Let's fix this:
                    </p>
                    <div className="bg-black/40 p-3 rounded-lg space-y-2 text-white/90 font-mono text-[10px] border border-white/5">
                      <div>
                        1. Open the {" "}
                        <a 
                          href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/providers`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-teal-400 hover:text-teal-300 font-bold underline inline-flex items-center gap-0.5"
                        >
                          Firebase Console Auth Page
                        </a>
                      </div>
                      <div>2. Under <strong>"Sign-in method"</strong>, click <strong>"Add new provider"</strong></div>
                      <div>3. Select <strong>"Email/Password"</strong></div>
                      <div>4. Switch the <strong>"Enable"</strong> toggle to <span className="text-teal-400">ON</span>, and click <strong>"Save"</strong></div>
                    </div>
                    <div className="text-white/40 text-[9px] mt-1 italic">
                      Once saved in the Firebase Console, you can register and login to your Joamedic account perfectly!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!user ? (
                /* Interactive Auth Suite: SignUp and SignIn Tabs */
                <div className="flex flex-col" id="profile-auth-section">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center mb-4 mx-auto border border-teal-500/20">
                      <User size={30} />
                    </div>
                    <h2 className="text-xl font-display font-semibold text-white tracking-tight">
                      {t('auth.registry.title')}
                    </h2>
                    <p className="text-white/50 text-xs mt-1">
                      {t('auth.registry.desc')}
                    </p>
                  </div>

                  {/* Navigation Tab selection */}
                  <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
                    <button 
                      onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                      className={`flex-1 py-2 text-center text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${authMode === 'signin' ? 'bg-teal-500 text-emerald-950 font-bold shadow-md' : 'text-white/60 hover:text-white'}`}
                      id="tab-signin-toggle"
                    >
                      {t('auth.signin')}
                    </button>
                    <button 
                      onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                      className={`flex-1 py-2 text-center text-xs font-semibold tracking-wider uppercase rounded-lg transition-all ${authMode === 'signup' ? 'bg-teal-500 text-emerald-950 font-bold shadow-md' : 'text-white/60 hover:text-white'}`}
                      id="tab-signup-toggle"
                    >
                      {t('auth.signup')}
                    </button>
                  </div>

                  {/* Auth Action Form */}
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'signup' && (
                      <>
                        {/* Display Name registration */}
                        <div>
                          <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5Packed">{t('auth.fullname')}</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                            <input 
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder={t('auth.fullname.placeholder')}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-teal-400 transition-all placeholder:text-white/20"
                              required
                              id="reg-display-name"
                            />
                          </div>
                        </div>

                        {/* Phone Number registration */}
                        <div>
                          <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5">{t('auth.phone')}</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                            <input 
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="+213 550 123 456"
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-teal-400 transition-all placeholder:text-white/20"
                              required
                              id="reg-phone"
                            />
                          </div>
                          <span className="text-[9px] text-white/40 mt-1 block">{t('auth.phone.desc')}</span>
                        </div>
                      </>
                    )}

                    {/* Email credentials */}
                    <div>
                      <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5">{t('auth.email')}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t('auth.email.placeholder')}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-teal-400 transition-all placeholder:text-white/20"
                          required
                          id="auth-email-input"
                        />
                      </div>
                    </div>

                    {/* Password credentials */}
                    <div>
                      <label className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5">{t('auth.password')}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-12 text-sm text-white focus:outline-none focus:border-teal-400 transition-all placeholder:text-white/20"
                          required
                          id="auth-password-input"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                          id="password-visibility-btn"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="w-full glass-button shine-effect bg-teal-500 hover:bg-teal-400 text-emerald-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                      id="auth-submit-btn"
                    >
                      {isSubmittingAuth ? (
                        <div className="w-5 h-5 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        authMode === 'signin' ? t('auth.btn.signin') : t('auth.btn.signup')
                      )}
                    </button>
                  </form>

                  {/* Standard Google Single-Sign On */}
                  <div className="relative my-6" id="auth-divider">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-[#1c3c31] px-3 text-white/40">{t('auth.alternative')}</span></div>
                  </div>

                  <button 
                    onClick={handleGoogleSignIn}
                    className="w-full glass-button shine-effect bg-white/5 hover:bg-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-3 border border-white/10"
                    id="auth-google-btn"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('auth.google')}
                  </button>
                </div>
              ) : (
                /* Authenticated user Profile Dashboard */
                <div id="profile-dashboard-section">
                  
                  {/* Avatar, Picture Upload, and Title */}
                  <div className="flex flex-col items-center text-center pb-6 border-b border-white/10 mb-6">
                    <div className="relative group mb-4">
                      {userProfile?.photoURL ? (
                        <img 
                          src={userProfile.photoURL} 
                          alt={userProfile.displayName || 'Clinical Officer'} 
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 rounded-full object-cover border-4 border-teal-400/30 shadow-xl group-hover:border-teal-400 transition-all"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-teal-500/10 text-teal-300 flex items-center justify-center text-3xl font-bold uppercase border-4 border-teal-400/20">
                          {user.email?.charAt(0)}
                        </div>
                      )}

                      {/* Customize picture click action */}
                      <button 
                        type="button"
                        onClick={() => { setShowAvatarSelector(!showAvatarSelector); setAuthError(''); }}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-teal-500 text-emerald-950 flex items-center justify-center shadow-lg hover:bg-teal-400 transition-colors cursor-pointer border-2 border-emerald-950"
                        title="Change Profile Picture"
                        id="avatar-picker-trigger"
                      >
                        <Camera size={14} />
                      </button>
                    </div>

                    {/* Avatar Preset and base64 file customizer drawers */}
                    <AnimatePresence>
                      {showAvatarSelector && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 mb-4 overflow-hidden"
                          id="avatar-selector-panel"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Choose Clinical Avatar</h4>
                            {/* Standard file selector upload trigger */}
                            <label className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-teal-300 cursor-pointer transition-colors">
                              <Upload size={10} />
                              <span>Upload Photo</span>
                              <input 
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-5 gap-2" id="avatar-presets-grid">
                            {AVATAR_PRESETS.map((avatar, idx) => (
                              <button
                                key={idx}
                                onClick={() => selectAvatarPreset(avatar.url)}
                                className={`w-10 h-10 rounded-full border overflow-hidden p-0.5 transition-all ${userProfile?.photoURL === avatar.url ? 'border-teal-400 bg-teal-500/20 scale-110 shadow-md' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                                title={avatar.name}
                              >
                                <img src={avatar.url} alt="Preset visual" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <h2 className="text-xl font-display font-semibold text-white tracking-tight flex items-center gap-2 justify-center">
                      <span>{userProfile?.displayName || user.displayName || 'Dental Practitioner'}</span>
                      {userProfile?.phoneVerified && (
                        <Award size={16} className="text-teal-400" title="Verified Professional Account" />
                      )}
                    </h2>
                    <p className="text-white/40 text-xs mt-1">{userProfile?.email || user.email}</p>
                  </div>

                  {/* Profile Edit or display credentials details */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6" id="profile-registry-details">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Medical Credential File</h3>
                      <button
                        onClick={() => {
                          if (isEditingProfile) {
                            handleProfileSave();
                          } else {
                            setIsEditingProfile(true);
                          }
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${isEditingProfile ? 'bg-teal-500 text-emerald-950' : 'bg-white/10 hover:bg-white/15 text-white/80'}`}
                        id="profile-edit-btn"
                      >
                        {isEditingProfile ? "Done Editing" : "Modify Credentials"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {isEditingProfile ? (
                        <>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-1">Full Name</label>
                            <input 
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-teal-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 uppercase mb-1">Telephone</label>
                            <input 
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-teal-400"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-white/30 block text-[9px] uppercase tracking-wider">Professional Status</span>
                            <span className="text-white/80 font-medium mt-1 block">Registered Practitioner</span>
                          </div>
                          <div>
                            <span className="text-white/30 block text-[9px] uppercase tracking-wider">Account Security</span>
                            <span className="text-teal-300 font-medium mt-1 block flex items-center gap-1">
                              Verified
                            </span>
                          </div>
                          <div className="col-span-2 border-t border-white/5 pt-3">
                            <span className="text-white/30 block text-[9px] uppercase tracking-wider">Simulated SMS Channel</span>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-white/80 font-medium font-mono">
                                {userProfile?.phoneNumber || "No number saved"}
                              </span>
                              
                              {userProfile?.phoneNumber ? (
                                userProfile.phoneVerified ? (
                                  <span className="px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 font-bold text-[9px] uppercase tracking-widest flex items-center gap-1">
                                    <Check size={10} /> Validated
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={triggerPhoneVerification}
                                    className="px-2.5 py-1 bg-red-400/20 hover:bg-teal-400 hover:text-emerald-950 text-red-300 border border-red-500/30 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                  >
                                    Verify Number
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingProfile(true)}
                                  className="text-xs text-teal-400 hover:text-teal-300 hover:underline"
                                >
                                  + Connect Phone
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order History */}
                  <div className="space-y-6" id="orders-dashboard-grid animate-fade">
                    <div>
                      <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Package size={15} /> Medical Orders History
                      </h3>
                      
                      {loadingOrders ? (
                        <div className="h-32 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : orders.length > 0 ? (
                        <div className="space-y-3">
                          {orders.map((order) => {
                            const isExpanded = expandedOrder === order.id;
                            const statusLevel = getStatusLevel(order.status);
                            
                            return (
                              <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-300">
                                <div 
                                  className="p-4 cursor-pointer hover:bg-white/5 flex flex-col gap-2"
                                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium text-white/80 font-mono truncate max-w-[120px] sm:max-w-xs">{order.id}</div>
                                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'completed' || order.status === 'delivered' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                                        {order.status}
                                      </div>
                                    </div>
                                    <div className="text-white/50">
                                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-end mt-2">
                                    <div className="text-xs text-white/50 flex items-center gap-1">
                                      <Clock size={12} /> {getOrderDateString(order.createdAt)}
                                    </div>
                                    <div className="text-sm font-bold text-white">{order.total || 0} DA</div>
                                  </div>
                                </div>
                                
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden bg-black/20"
                                    >
                                      <div className="p-4 border-t border-white/5">
                                        <h4 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-6">{t('orderStatus.trackingTimeline') || 'Tracking Timeline'}</h4>
                                        
                                        <div className="relative pt-2 pb-6 px-4">
                                          <div className="absolute top-6 left-8 right-8 h-1 bg-white/10 rounded-full z-0"></div>
                                          <div className={`absolute top-6 left-8 h-1 bg-teal-400 rounded-full z-0 shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-1000 ${statusLevel === 1 ? 'w-0' : statusLevel === 2 ? 'w-1/2' : 'w-full'}`}></div>
                                          
                                          <div className="flex justify-between items-start relative z-10 w-full mb-2">
                                            <div className="flex flex-col items-center gap-3 relative -translate-x-1/2 left-4">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${statusLevel >= 1 ? 'bg-teal-500 text-black shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'bg-white/10 text-white/30'}`}>
                                                <CheckCircle2 size={16} />
                                              </div>
                                              <span className={`text-[10px] uppercase font-bold tracking-widest ${statusLevel >= 1 ? 'text-teal-400' : 'text-white/30'}`}>{t('orderStatus.processing') || 'Processing'}</span>
                                            </div>
                                            
                                            <div className="flex flex-col items-center gap-3 relative">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${statusLevel >= 2 ? 'bg-teal-500 text-black shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'bg-white/10 text-white/30'}`}>
                                                <Truck size={16} />
                                              </div>
                                              <span className={`text-[10px] uppercase font-bold tracking-widest ${statusLevel >= 2 ? 'text-teal-400' : 'text-white/30'}`}>{t('orderStatus.shipped') || 'Shipped'}</span>
                                            </div>
                                            
                                            <div className="flex flex-col items-center gap-3 relative translate-x-1/2 right-4">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${statusLevel >= 3 ? 'bg-teal-500 text-black shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'bg-white/10 text-white/30'}`}>
                                                <Package size={16} />
                                              </div>
                                              <span className={`text-[10px] uppercase font-bold tracking-widest ${statusLevel >= 3 ? 'text-teal-400' : 'text-white/30'}`}>{t('orderStatus.delivered') || 'Delivered'}</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                          <h4 className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-widest">{t('orderStatus.itemsOrdered') || 'Items ordered'}</h4>
                                          <div className="space-y-2">
                                            {order.items?.map((item: any, i: number) => (
                                              <div key={i} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                  <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-xs text-white/70">{item.quantity}x</span>
                                                  <span className="text-white/80">{item.name}</span>
                                                  {item.size && <span className="text-xs text-white/40">({item.size})</span>}
                                                </div>
                                                <span className="text-teal-300">{item.price}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-white/5 border border-white/10 rounded-xl">
                          <p className="text-white/50 text-sm">No medical apparel orders filed.</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => { logout(); onClose(); }}
                      className="w-full glass-button shine-effect bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-300 font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2"
                      id="profile-logout-btn"
                    >
                      <LogOut size={16} /> Sign Out of Registry
                    </button>

                    {onOpenAdmin && (
                      <button 
                        onClick={handleOpenAdmin}
                        className="w-full mt-2 glass-button shine-effect bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20 text-teal-300 font-medium py-3 rounded-xl transition-all flex justify-center items-center gap-2"
                        id="profile-admin-dashboard-btn"
                      >
                        <User size={16} /> Open Hospital Admin Console
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Numerical PIN Entry Overlay for Phone validation */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVerificationModal(false)}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#10241e] border border-teal-500/30 rounded-2xl p-6 shadow-2xl w-full max-w-sm"
          >
            <h3 className="text-lg font-display font-semibold text-white mb-2 flex items-center gap-2">
              <Phone className="text-teal-400 animate-pulse" size={18} />
              Validate Telephone Number
            </h3>
            <p className="text-white/60 text-xs mb-4">
              We dispatched an OTP simulation trigger. Please copy and enter the security PIN.
            </p>

            {/* Test Simulation Notification box */}
            <div className="bg-teal-500/10 border border-teal-500/20 p-3 rounded-xl mb-4 text-center">
              <span className="block text-[10px] text-teal-300 uppercase font-bold tracking-wider">Simulated SMS SMS Header</span>
              <span className="text-sm font-semibold text-white block mt-1">
                Joamedic PIN: <strong className="text-teal-300 text-lg ml-1 select-all">{verificationCode}</strong>
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase font-bold text-white/50 mb-1.5 text-center">Enter 4-Digit Security Code</label>
                <input 
                  type="text"
                  maxLength={4}
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 text-center text-xl font-bold tracking-[1em] pl-[1em] text-white focus:outline-none focus:border-teal-400 transition-all focus:bg-black/60"
                  id="sms-otp-input"
                />
              </div>

              {verificationError && (
                <p className="text-red-300 text-xs text-center">{verificationError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowVerificationModal(false)}
                  className="flex-1 py-3 border border-white/10 rounded-xl text-xs text-white/60 hover:text-white transition-colors"
                  id="sms-otp-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPhoneVerification}
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-emerald-950 font-bold rounded-xl text-xs transition-colors shadow-lg"
                  id="sms-otp-confirm"
                >
                  Validate
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
