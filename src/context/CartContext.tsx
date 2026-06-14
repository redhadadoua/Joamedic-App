import React, { createContext, useContext, useState } from 'react';

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

  return (
    <CartContext.Provider value={{ 
      isCartOpen, setIsCartOpen, 
      isCheckoutOpen, setIsCheckoutOpen,
      cartItems, addToCart, removeFromCart, 
      updateQuantity, updateSize, clearCart, 
      cartTotal, cartCount 
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
