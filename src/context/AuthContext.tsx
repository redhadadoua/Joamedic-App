import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  createdAt?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, phoneNumber: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  updateUserProfile: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (currentUser: User) => {
    const localBackup = localStorage.getItem(`profile_${currentUser.uid}`);
    if (localBackup) {
      try {
        setUserProfile(JSON.parse(localBackup));
      } catch (_) {}
    }

    try {
      const docRef = doc(db, 'users', currentUser.uid);
      
      // Let's read with up to 3 retries in case the connection or auth state is initializing
      let docSnap = null;
      let readAttempts = 0;
      while (readAttempts < 3) {
        try {
          docSnap = await getDocFromServer(docRef).catch(() => getDoc(docRef));
          break;
        } catch (readErr) {
          readAttempts++;
          console.warn(`fetchUserProfile read attempt ${readAttempts} failed:`, readErr);
          if (readAttempts >= 3) {
            throw readErr;
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (data.role !== 'admin') {
          // Admin role is managed in Firestore solely now
        }
        setUserProfile(data);
        localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(data));
      } else {
        const pendingDisplayName = sessionStorage.getItem('pending_signup_displayName');
        const pendingPhoneNumber = sessionStorage.getItem('pending_signup_phoneNumber');
        
        const newProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: pendingDisplayName || currentUser.displayName || 'Medic Member',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(pendingDisplayName || currentUser.displayName || 'Medic')}`,
          phoneNumber: pendingPhoneNumber || '',
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          role: 'user'
        };

        // Delay briefly for auth token propagation
        await new Promise(resolve => setTimeout(resolve, 150));

        let saved = false;
        let attempts = 0;
        while (!saved && attempts < 5) {
          try {
            await setDoc(docRef, newProfile);
            saved = true;
          } catch (dbErr) {
            attempts++;
            console.error(`fetchUserProfile retry ${attempts} failed to initialize user document:`, dbErr);
            if (attempts >= 5) break;
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        if (pendingDisplayName) {
          sessionStorage.removeItem('pending_signup_displayName');
        }
        if (pendingPhoneNumber) {
          sessionStorage.removeItem('pending_signup_phoneNumber');
        }

        setUserProfile(newProfile);
        localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
      }
    } catch (error) {
      console.warn('Firestore user doc fetch failed, continuing in offline/temporary mode:', error);
      if (!localBackup) {
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Medic Member',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=user`,
          phoneNumber: '',
          phoneVerified: false,
          createdAt: new Date().toISOString(),
          role: 'user'
        });
      }
    }
  };

  const signUpInProgressRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Only run fetchUserProfile automatically if this is a login or external auth change,
        // rather than our active manual email/password signUp sequence which writes explicitly.
        if (!signUpInProgressRef.current) {
          await fetchUserProfile(currentUser);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, displayName: string, phoneNumber: string) => {
    signUpInProgressRef.current = true;
    sessionStorage.setItem('pending_signup_displayName', displayName);
    sessionStorage.setItem('pending_signup_phoneNumber', phoneNumber);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      
      try {
        await updateProfile(currentUser, { displayName });
      } catch (profErr) {
        console.warn("Auth displayName sync failed, continuing:", profErr);
      }
      
      const profileData: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || email,
        displayName,
        phoneNumber,
        phoneVerified: false,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(displayName)}`,
        createdAt: new Date().toISOString(),
        role: 'user'
      };

      // Propagation delay for security rules logic sync
      await new Promise(resolve => setTimeout(resolve, 150));

      let written = false;
      let attempts = 0;
      let lastErr = null;
      while (!written && attempts < 5) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), profileData);
          written = true;
        } catch (dbErr) {
          attempts++;
          lastErr = dbErr;
          console.error(`signUp write attempt ${attempts} failed:`, dbErr);
          if (attempts >= 5) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (!written) {
        console.warn("Retrying profile write in active fallback mode.");
        try {
          await setDoc(doc(db, 'users', currentUser.uid), profileData);
        } catch (retryErr) {
          console.error("Critical fallback write failed:", retryErr);
        }
      }
      
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(profileData));
      setUserProfile(profileData);
    } catch (err: any) {
      console.error("Could not write Firestore record during sign up:", err);
      throw new Error("Failed to register your profile in the medical directory: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      signUpInProgressRef.current = false;
      if (sessionStorage.getItem('pending_signup_displayName')) {
        sessionStorage.removeItem('pending_signup_displayName');
      }
      if (sessionStorage.getItem('pending_signup_phoneNumber')) {
        sessionStorage.removeItem('pending_signup_phoneNumber');
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    setUserProfile((prev) => {
      const next = prev ? { ...prev, ...updates } : { uid, email: auth.currentUser?.email || '', ...updates };
      localStorage.setItem(`profile_${uid}`, JSON.stringify(next));
      return next;
    });

    if (updates.displayName || updates.photoURL) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName || auth.currentUser.displayName,
          photoURL: updates.photoURL || auth.currentUser.photoURL
        });
      } catch (err) {
        console.warn("Auth standard profile sync failed:", err);
      }
    }

    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, updates, { merge: true });
    } catch (err) {
      console.warn("Firestore update skipped (saved offline only):", err);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const isAdmin = !!(userProfile?.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, updateUserProfile, signInWithGoogle, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

