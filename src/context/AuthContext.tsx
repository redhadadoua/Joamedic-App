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
      const docSnap = await getDocFromServer(docRef).catch(() => getDoc(docRef));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (currentUser.email === 'redhadadoua@gmail.com' && data.role !== 'admin') {
          data.role = 'admin';
          try {
            await setDoc(docRef, { role: 'admin' }, { merge: true });
          } catch (_) {}
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
          role: currentUser.email === 'redhadadoua@gmail.com' ? 'admin' : 'user'
        };

        if (pendingDisplayName) {
          sessionStorage.removeItem('pending_signup_displayName');
        }
        if (pendingPhoneNumber) {
          sessionStorage.removeItem('pending_signup_phoneNumber');
        }

        try {
          await setDoc(docRef, newProfile);
        } catch (dbErr) {
          console.error("Firestore user profile initialization error during login:", dbErr);
        }
        setUserProfile(newProfile);
        localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
      }
    } catch (error) {
      console.warn('Firestore user doc fetch failed, continuing in offline mode:', error);
      if (!localBackup) {
        setUserProfile({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Medic Member',
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=user`,
          phoneNumber: '',
          phoneVerified: false
        });
      }
    }
  };

  const signUpInProgressRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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
        role: currentUser.email === 'redhadadoua@gmail.com' ? 'admin' : 'user'
      };

      await setDoc(doc(db, 'users', currentUser.uid), profileData);
      
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

  const isAdmin = !!(user && (user.email === 'redhadadoua@gmail.com' || userProfile?.role === 'admin'));

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, updateUserProfile, signInWithGoogle, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

