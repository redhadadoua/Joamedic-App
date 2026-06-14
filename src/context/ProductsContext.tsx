import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs, getDocsFromCache, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from './CartContext';
import { products as initialProducts } from '../data/products';

interface ProductsContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Step 1: Pre-populate from cache immediately to enable zero-wait offline load
      try {
        const cacheSnapshot = await getDocsFromCache(collection(db, 'products'));
        if (cacheSnapshot && !cacheSnapshot.empty) {
          const cachedList: Product[] = [];
          cacheSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cachedList.push({
              id: Number(docSnap.id),
              name: data.name,
              category: data.category,
              price: data.price,
              image: data.image,
              color: data.color,
              specs: data.specs || [],
              description: data.description || '',
              stock: data.stock !== undefined ? data.stock : 10
            } as Product);
          });
          cachedList.sort((a, b) => a.id - b.id);
          setProducts(cachedList);
          setLoading(false); // Quick success resolution
        }
      } catch (cacheErr) {
        console.log('No products found in offline cache: ', cacheErr);
      }

      // Step 2: Query database with a fast timeout
      const timeoutPromise = new Promise<any>((resolve) => 
        setTimeout(() => resolve(null), 1500)
      );

      const serverSnapshot = await Promise.race([
        getDocs(collection(db, 'products')),
        timeoutPromise
      ]);
      
      if (!serverSnapshot && products.length === 0) {
        throw new Error('Firestore connection timeout');
      }
      
      if (serverSnapshot) {
        if (serverSnapshot.empty) {
          // Feed initial products to database if empty
          const batch = writeBatch(db);
          const seededList: Product[] = [];
          
          for (const item of initialProducts) {
            const productWithStock: Product & { stock: number } = {
              ...item,
              stock: item.id === 1 ? 12 : item.id === 2 ? 24 : item.id === 3 ? 15 : 40
            };
            
            const docRef = doc(db, 'products', String(item.id));
            batch.set(docRef, productWithStock);
            seededList.push(productWithStock);
          }
          
          await batch.commit();
          setProducts(seededList);
        } else {
          const fetchedList: Product[] = [];
          serverSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetchedList.push({
              id: Number(docSnap.id),
              name: data.name,
              category: data.category,
              price: data.price,
              image: data.image,
              color: data.color,
              specs: data.specs || [],
              description: data.description || '',
              stock: data.stock !== undefined ? data.stock : 10
            } as Product);
          });
          
          // Sort products by original ID order
          fetchedList.sort((a, b) => a.id - b.id);
          setProducts(fetchedList);
        }
      }
    } catch (err) {
      console.warn('Network issue loading products, fallback to static defaults:', err);
      if (products.length === 0) {
        setProducts(initialProducts.map(p => ({ ...p, stock: 15 })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = {
      ...productData,
      id: nextId,
      stock: productData.stock !== undefined ? productData.stock : 10,
      specs: productData.specs || []
    };

    // Optimistic offline-safe UI update
    setProducts((prev) => [...prev, newProduct]);

    try {
      await setDoc(doc(db, 'products', String(nextId)), newProduct);
    } catch (err) {
      console.warn('Skipped setDoc online update, Firestore is offline:', err);
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    // Optimistic offline-safe UI update
    setProducts((prev) => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

    try {
      const docRef = doc(db, 'products', String(updatedProduct.id));
      await setDoc(docRef, {
        ...updatedProduct,
        specs: updatedProduct.specs || []
      });
    } catch (err) {
      console.warn('Skipped setDoc online update, Firestore is offline:', err);
    }
  };

  const deleteProduct = async (id: number) => {
    // Optimistic offline-safe UI update
    setProducts((prev) => prev.filter(p => p.id !== id));

    try {
      await deleteDoc(doc(db, 'products', String(id)));
    } catch (err) {
      console.warn('Skipped deleteDoc online update, Firestore is offline:', err);
    }
  };

  return (
    <ProductsContext.Provider value={{
      products,
      loading,
      addProduct,
      updateProduct,
      deleteProduct,
      refreshProducts: fetchProducts
    }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};
