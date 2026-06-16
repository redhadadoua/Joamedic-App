import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeApiKeyForBuildProcess12345678",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "missing.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:1234567890abcdef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Mute Firestore connection and offline warning console logs
setLogLevel('silent');

// Configure robust local caching for offline resiliency
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

// Core Firestore Error Handler matching the schema of Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Safe logging without PII
  console.error(`[Firestore Error] Operation: ${operationType}, Path: ${path}, Error: ${errMessage}`);
  
  // Throwing string safe for UI catch blocks
  throw new Error(`Data operation failed (${operationType}). Please check permissions or connection.`);
}

// Connection test helper following strict Skill prerequisites
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Please check your Firebase configuration or security rules.");
    }
  }
}

// Initial connection test boot - deferred to 4 seconds to never block early asset load
setTimeout(() => {
  testConnection().catch(err => {
    console.warn("Firestore diagnostic connection error:", err);
  });
}, 4000);

