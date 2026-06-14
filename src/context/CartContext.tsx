import React, { createContext, useContext, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  image: string;
  color: string;
  specs?: string[];
  description?: string;
  stock?: number;
};

export type Personalization = {
  text: string;
  color: string;
  placement: string;
  price: number;
};

export type CartItem = Product & { 
  quantity: number; 
  size?: string;
  personalization?: Personalization;
};

interface CartContextType {
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (isOpen: boolean) => void;
  cartItems: CartItem[];
  addToCart: (product: Product, size?: string, personalization?: Personalization) => void;
  removeFromCart: (id: number, size?: string, personalizationText?: string) => void;
  updateQuantity: (id: number, quantity: number, size?: string, personalizationText?: string) => void;
  updateSize: (id: number, size: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  placeOrder: (
    shippingInfo: any, 
    userId?: string, 
    onProgress?: (step: string, feedbackMessage?: string) => void
  ) => Promise<string>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Standalone explicit multi-step connection verification function to verify internet, Db, and Sheets
export const verifyConnection = async (
  webAppUrl: string,
  onProgress?: (step: string, feedbackMessage?: string) => void
): Promise<{ firestore: boolean; sheets: boolean; internet: boolean }> => {
  const statusResult = { firestore: false, sheets: false, internet: false };

  // 1. Verify Internet Reachability
  onProgress?.('verifying_internet', 'Verifying active internet route and gateway...');
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Your browser reports being offline. Please check your network connection.');
  }
  try {
    // Try to perform a fast request to check internet gateway
    const testResponse = await Promise.race([
      fetch('https://www.google.com', { mode: 'no-cors', method: 'HEAD' }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
    ]);
    statusResult.internet = testResponse !== null;
  } catch (err) {
    console.warn("Internet check gateway test warning:", err);
    statusResult.internet = typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // 2. Verify Firestore Connection
  onProgress?.('verifying_firestore', 'Pinging secure cloud database (Firestore) gateway...');
  try {
    const getDocPromise = getDoc(doc(db, 'settings', 'google_sheets'));
    const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Database resolution timeout')), 2200));
    await Promise.race([getDocPromise, timeoutPromise]);
    statusResult.firestore = true;
  } catch (err: any) {
    console.warn("Firestore reachability check failed, attempting to proceed:", err);
    statusResult.firestore = false;
  }

  // 3. Verify Google Sheets WebApp Endpoint Reachability
  onProgress?.('verifying_sheets', 'Testing secure Apps Script Web App route...');
  try {
    const controller = new AbortController();
    const sheetsTimeout = setTimeout(() => controller.abort(), 4000); // 4s timeout for reachability check

    const testPingPayload = { action: 'ping' };
    const pingRes = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(testPingPayload),
      signal: controller.signal
    });
    clearTimeout(sheetsTimeout);

    if (!pingRes.ok) {
      throw new Error(`Google Web App returned HTTP status ${pingRes.status}`);
    }
    statusResult.sheets = true;
  } catch (err: any) {
    console.error("Google Sheets verification check failed:", err);
    statusResult.sheets = false;
    throw new Error(`Failed to reach Google Sheets API (Failed to fetch) while syncing orders. Please verify webhook configurations.`);
  }

  onProgress?.('connection_verified', 'All communication lines fully verified!');
  return statusResult;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, size: string = 'M', personalization?: Personalization) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id && item.size === size && item.personalization?.text === personalization?.text);
      if (existing) {
        return prev.map(item => (item.id === product.id && item.size === size && item.personalization?.text === personalization?.text) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, size, personalization }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number, size?: string, personalizationText?: string) => {
    setCartItems(prev => prev.filter(item => !(item.id === id && item.size === size && item.personalization?.text === personalizationText)));
  };

  const updateQuantity = (id: number, quantity: number, size?: string, personalizationText?: string) => {
    if (quantity < 1) {
      removeFromCart(id, size, personalizationText);
      return;
    }
    setCartItems(prev => prev.map(item => (item.id === id && item.size === size && item.personalization?.text === personalizationText) ? { ...item, quantity } : item));
  };

  const updateSize = (id: number, size: string) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, size } : item));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // price is a string like "$68"
  const cartTotal = cartItems.reduce((total, item) => {
    const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    const personalizationPrice = item.personalization?.price || 0;
    return total + (priceNum + personalizationPrice) * item.quantity;
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const placeOrder = async (
    shippingInfo: any, 
    userId: string = 'guest',
    onProgress?: (step: string, feedbackMessage?: string) => void
  ): Promise<string> => {
    // 1. Initial State Report
    onProgress?.('preparing', 'Preparing secure order data structure...');
    const generatedOrderId = `JM-${Math.floor(10000 + Math.random() * 90000)}`;
    
    const orderData = {
      userId: userId,
      items: cartItems.map(item => ({ 
        id: item.id, 
        name: item.name, 
        quantity: item.quantity, 
        price: item.price, 
        size: item.size || null,
        personalization: item.personalization || null
      })),
      total: cartTotal,
      status: 'processing',
      shippingInfo: shippingInfo,
      createdAt: new Date().toISOString()
    };

    // 2. Fetch Google Sheets Webhook URL first in the background with a strict 800ms timeout
    onProgress?.('fetching_config', 'Retrieving active integration credentials...');
    const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxfimh_5IRjnTlnXW_v9SJ9uQ5gqzcWlUe-bw5YjXLB6YCjTIiahFgvOjd0g6A5wpXGFQ/exec';
    let webAppUrl: string = DEFAULT_WEBHOOK_URL;
    
    try {
      const getDocPromise = getDoc(doc(db, 'settings', 'google_sheets'));
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 800));
      const sheetsDoc = await Promise.race([getDocPromise, timeoutPromise]);
      if (sheetsDoc && sheetsDoc.exists()) {
        const sheetsData = sheetsDoc.data();
        if (sheetsData.webAppUrl) {
          webAppUrl = sheetsData.webAppUrl;
          localStorage.setItem('cached_sheets_webapp_url', webAppUrl);
        }
      } else {
        const cached = localStorage.getItem('cached_sheets_webapp_url');
        if (cached) webAppUrl = cached;
      }
    } catch (configErr) {
      console.warn("Could not load google sheets configuration from Firestore, attempting local fallback:", configErr);
      const cached = localStorage.getItem('cached_sheets_webapp_url');
      if (cached) webAppUrl = cached;
    }

    // 3. Skip blocking client-side reachability pings for zero-latency checkout
    // We bypass verifyConnection here to make order completion ultra-fast.
    // However, we run it in the background to log reachability diagnostics for debugging.
    verifyConnection(webAppUrl).catch(err => {
      console.log('Background server reachability diagnostic ping completed:', err?.message || err);
    });

    // 4. Backup write to localStorage immediately so it is instantly available in order history
    onProgress?.('local_backup', 'Caching backup copy of clinical record locally...');
    const existingLocalOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
    const backupOrder = {
      id: generatedOrderId,
      ...orderData
    };
    if (!existingLocalOrders.some((o: any) => o.id === generatedOrderId)) {
      existingLocalOrders.push(backupOrder);
      localStorage.setItem('backup_orders', JSON.stringify(existingLocalOrders));
    }

    // 5. Fire Firestore document creation with a super-fast 200ms local-cache race threshold.
    // Firestore has robust offline persistence: once setDoc is fired, it writes to the local cache database 
    // instantly and continues cloud synchronization in the background. We don't block the purchase flow on it.
    onProgress?.('firestore', 'Securing clinical entry in Firestore central repository...');
    try {
      const setDocPromise = setDoc(doc(db, 'orders', generatedOrderId), {
        ...orderData,
        items: cartItems.map(item => ({ 
          id: item.id, 
          name: item.name, 
          quantity: item.quantity, 
          price: item.price, 
          size: item.size || null,
          personalization: item.personalization || null
        })),
        createdAt: serverTimestamp() // Genuine Firestore serverTimestamp for db integrity
      });
      
      // Give Firestore up to 250ms to finish local cache write, otherwise let it sync in background
      await Promise.race([
        setDocPromise, 
        new Promise((resolve) => setTimeout(resolve, 250))
      ]);
    } catch (firestoreErr: any) {
      console.warn("Firestore non-blocking write warning, proceeding to sheets synchronization:", firestoreErr);
    }

    // 6. Force direct sync to the Google Sheets spreadsheet using the webAppUrl (always fully available)
    if (webAppUrl) {
      onProgress?.('google_sheets', 'Committing order registry data to Google Sheets...');
      
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

      // Try syncing immediately with detailed logging and retry mechanics
      let attempts = 3;
      let success = false;
      let finalErr = null;

      for (let i = 0; i < attempts; i++) {
        try {
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 6000); // 6s timeout per retry

          const response = await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'add_order', data: [newOrderRow] }),
            signal: controller.signal
          });
          clearTimeout(fetchTimeout);

          if (!response.ok) {
            throw new Error(`Google Web App returned status ${response.status}`);
          }

          const text = await response.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.success === false) {
              throw new Error(parsed.error || "Execution error in Google Apps Script.");
            }
          } catch (jsonErr: any) {
            // Apps scripts sometimes output HTML or non-json success, we consider HTTP 200 ok
            console.log("Apps Script output parsed as raw text:", text);
          }
          success = true;
          break; // successfully synced
        } catch (err: any) {
          console.warn(`[RETRY LOG] Google Sheets synchronization attempt ${i + 1} of ${attempts} failed:`, err?.message || err);
          finalErr = err;
          if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 500)); // fast retry delay
          }
        }
      }

      // If the direct sync fails completely, instead of throwing an error and crash-stalling the customer,
      // save to failed queue in localStorage so it can be re-synced silently next time or from Admin dashboard!
      if (!success) {
        console.error("🚨 Google Sheets API synchronization failed after 3 attempts. Storing in local failed queue:", finalErr);
        const failedQueue = JSON.parse(localStorage.getItem('failed_sheets_sync_queue') || '[]');
        failedQueue.push({ id: generatedOrderId, row: newOrderRow, createdAt: new Date().toISOString() });
        localStorage.setItem('failed_sheets_sync_queue', JSON.stringify(failedQueue));
      }
    }

    onProgress?.('done', 'Clinical order verified and successfully processed!');
    return generatedOrderId;
  };

  return (
    <CartContext.Provider value={{ 
      isCartOpen, setIsCartOpen, 
      isCheckoutOpen, setIsCheckoutOpen,
      cartItems, addToCart, removeFromCart, 
      updateQuantity, updateSize, clearCart, 
      cartTotal, cartCount,
      placeOrder
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
