import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin dynamically to avoid crashing if env is missing
let adminInstalled = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount)
    });
    adminInstalled = true;
    console.log("Firebase Admin successfully initialized.");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault()
    });
    adminInstalled = true;
    console.log("Firebase Admin successfully initialized via ADC.");
  } else {
    console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT_KEY is not set. Admin API integrations (like syncing users) will fail.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase Admin:", err);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Add CORS headers for local dev if needed
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Sync Firebase Auth users to Firestore `users` collection
app.post("/api/admin/sync-users", async (req, res) => {
  if (!adminInstalled) {
    return res.status(500).json({ 
      success: false, 
      error: "Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in your environment to enable this feature." 
    });
  }

  try {
    const firestore = getFirestore();
    const auth = getAuth();
    
    // Fetch all users from Firebase Auth (up to 1000 for simplicity)
    const listUsersResult = await auth.listUsers(1000);
    const users = listUsersResult.users;
    
    let addedCount = 0;
    
    // Fetch all current user documents
    const usersSnapshot = await firestore.collection('users').get();
    const existingUids = new Set();
    usersSnapshot.forEach(doc => {
      existingUids.add(doc.id);
    });

    const batch = firestore.batch();
    
    for (const authUser of users) {
      if (!existingUids.has(authUser.uid)) {
        // Prepare profile
        const role = authUser.email === 'redhadadoua@gmail.com' ? 'admin' : 'user';
        const docRef = firestore.collection('users').doc(authUser.uid);
        
        const profileData = {
          uid: authUser.uid,
          email: authUser.email || '',
          displayName: authUser.displayName || 'Medic Member',
          phoneVerified: false,
          photoURL: authUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authUser.displayName || 'User')}`,
          createdAt: authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : new Date().toISOString(),
          role: role
        };

        batch.set(docRef, profileData);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await batch.commit();
    }

    res.json({ 
      success: true, 
      message: `Checked ${users.length} Auth users. Synced ${addedCount} new users to Firestore.` 
    });
    
  } catch (err: any) {
    console.error("Error syncing users:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to sync users." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
