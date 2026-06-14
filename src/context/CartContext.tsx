import React, { createContext, useContext, useState } from 'react';
import { db } from '../firebase';
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
  placeOrder: (shippingInfo: any, userId?: string) => Promise<string>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

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

  const placeOrder = async (shippingInfo: any, userId: string = 'guest'): Promise<string> => {
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

    // 1. Fetch Google Sheets Webhook URL first in the background
    let webAppUrl: string | null = null;
    try {
      const sheetsDoc = await getDoc(doc(db, 'settings', 'google_sheets'));
      if (sheetsDoc && sheetsDoc.exists()) {
        const sheetsData = sheetsDoc.data();
        webAppUrl = sheetsData.webAppUrl || null;
      }
    } catch (configErr) {
      console.warn("Could not load google sheets configuration:", configErr);
    }

    // 2. Backup write to localStorage immediately so it is instantly available in order history
    const existingLocalOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
    const backupOrder = {
      id: generatedOrderId,
      ...orderData
    };
    if (!existingLocalOrders.some((o: any) => o.id === generatedOrderId)) {
      existingLocalOrders.push(backupOrder);
      localStorage.setItem('backup_orders', JSON.stringify(existingLocalOrders));
    }

    // 3. Await Firestore document creation to guarantee security & absolute persistence on the server
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
      
      // Wait at most 4 seconds. If offline, the promise won't resolve, but we can treat it as success locally.
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 4000));
      const res = await Promise.race([setDocPromise, timeoutPromise]);
      if (res === 'timeout') {
         console.warn("Firestore order took too long to respond. Safe-saving offline.");
      }
    } catch (firestoreErr: any) {
      console.error("Firestore order placement error:", firestoreErr);
      throw new Error(firestoreErr?.message || "Firestore insertion failed");
    }

    // 4. If a Google Sheets webhook exists, append the order details immediately to Google Sheets
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

        // Trigger append row to Google Sheet using text/plain to avoid CORS problems in production web applications
        await fetch(webAppUrl, {
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
