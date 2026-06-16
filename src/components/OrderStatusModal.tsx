import { motion, AnimatePresence } from 'motion/react';
import { X, Package, Search, Truck, CheckCircle2, FileDown } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

type OrderStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function OrderStatusModal({ isOpen, onClose }: OrderStatusModalProps) {
  const { t, language } = useLanguage();
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found'>('idle');
  const [orderData, setOrderData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Simulated Past Orders Data
  const pastOrders = [
    {
      id: 'ORD-8923-XZ',
      date: 'Oct 20, 2026',
      total: '4500 DA',
      status: 'Delivered',
      items: 3
    },
    {
      id: 'ORD-7741-QA',
      date: 'Sep 15, 2026',
      total: '3700 DA',
      status: 'Shipped',
      items: 1
    },
    {
      id: 'ORD-6124-BM',
      date: 'Aug 04, 2026',
      total: '7400 DA',
      status: 'Processing',
      items: 2
    }
  ];

  const simulatedOrderData: { [key: string]: any } = {
    'ORD-8923-XZ': {
      items: [
        { name: 'The Quantum Scrub Top', price: 2150, quantity: 2, size: 'M' },
        { name: 'Velocity Scrub Pants', price: 2350, quantity: 1, size: 'M' }
      ],
      total: 4500,
      status: 'delivered',
      shippingInfo: { name: 'Amine Ben', phone: '0555123456', wilaya: 'Algiers', city: 'Algiers', address: '12 Rue Didouche Mourad' },
      createdAt: '2026-10-20T20:00:00.000Z'
    },
    'ORD-7741-QA': {
      items: [
        { name: 'Elite Lab Coat', price: 3700, quantity: 1, size: 'L' }
      ],
      total: 3700,
      status: 'shipped',
      shippingInfo: { name: 'Sarah Dridi', phone: '0661987654', wilaya: 'Oran', city: 'Oran', address: '5 Boulevard de la Soummam' },
      createdAt: '2026-09-15T15:00:00.000Z'
    },
    'ORD-6124-BM': {
      items: [
        { name: 'Classic Scrub Set', price: 3700, quantity: 2, size: 'S' }
      ],
      total: 7400,
      status: 'processing',
      shippingInfo: { name: 'Kamel Rahmani', phone: '0770456123', wilaya: 'Constantine', city: 'Constantine', address: '8 Rue Larbi Ben M\'hidi' },
      createdAt: '2026-08-04T10:00:00.000Z'
    }
  };

  const trackOrderById = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    
    setStatus('loading');
    setErrorMsg('');
    setOrderData(null);
    
    // Check simulated past orders first
    if (simulatedOrderData[cleanId]) {
      setTimeout(() => {
        setOrderData(simulatedOrderData[cleanId]);
        setStatus('found');
      }, 1000);
      return;
    }
    
    try {
      const docRef = doc(db, 'orders', cleanId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrderData(docSnap.data());
        setStatus('found');
      } else {
        // Check offline/localStorage backup orders
        const backupOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
        const localOrder = backupOrders.find((o: any) => o.id === cleanId);
        if (localOrder) {
          setOrderData(localOrder);
          setStatus('found');
        } else {
          setErrorMsg(language === 'AR' ? 'عذراً، لم نتمكن من العثور على هذا الطلب' : language === 'FR' ? 'Commande introuvable' : 'Order not found');
          setStatus('idle');
        }
      }
    } catch (err) {
      console.warn("Firestore access error, falling back to local cache:", err);
      // Fallback local backup lookup if firestore read is permission denied or auth issue
      const backupOrders = JSON.parse(localStorage.getItem('backup_orders') || '[]');
      const localOrder = backupOrders.find((o: any) => o.id === cleanId);
      if (localOrder) {
        setOrderData(localOrder);
        setStatus('found');
      } else {
        setErrorMsg(language === 'AR' ? 'طلبك مسجل محلياً وسيتم تتبعه فور مزامنة الخدمة' : language === 'FR' ? 'Erreur de connexion' : 'Order is registered locally or network issue');
        setStatus('idle');
      }
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    trackOrderById(orderId);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setOrderId('');
      setOrderData(null);
      setErrorMsg('');
    }, 300);
  };

  const exportPDF = async () => {
    if (!invoiceRef.current) return;
    
    // Lazy load heavy PDF/Canvas dependencies to reduce bundle size
    const mHtml2canvas = await import('html2canvas');
    const html2canvas = mHtml2canvas.default || mHtml2canvas;
    
    const mJsPDF = await import('jspdf');
    const jsPDF = mJsPDF.default || mJsPDF;

    const element = invoiceRef.current;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#022c22' // Emerald 950 base color
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${orderId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF', error);
    }
  };

  const isRTL = language === 'AR';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-panel p-8 shadow-2xl flex flex-col overflow-hidden"
          >
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Package size={20} />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                {t('orderStatus.title')}
              </h2>
            </div>
            
            <p className="text-white/70 text-sm mb-8">
              {t('orderStatus.desc')}
            </p>

            {status === 'idle' && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                <form onSubmit={handleTrack} className="flex flex-col gap-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                      <Search size={18} />
                    </div>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder={t('orderStatus.input') || 'Enter your tracking number...'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-teal-400/50 transition-colors"
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-red-400 text-xs px-2 animate-pulse">{errorMsg}</p>
                  )}
                  <button 
                    type="submit"
                    disabled={!orderId.trim()}
                    className="w-full glass-button shine-effect bg-teal-500/20 border-teal-400/40 hover:bg-teal-500/30 text-white font-medium py-3 px-6 disabled:opacity-50 disabled:cursor-not-allowed animate-fade"
                  >
                    {t('orderStatus.btn') || 'Track Order'}
                  </button>
                </form>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-4">{t('orderStatus.pastOrders') || 'Past Orders'}</h3>
                  <div className="h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {pastOrders.map((order, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => { setOrderId(order.id); trackOrderById(order.id); }}>
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-white">{order.id}</p>
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            order.status === 'Delivered' ? 'bg-teal-500/20 border-teal-500/30 text-teal-300' :
                            order.status === 'Shipped' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                            'bg-orange-500/20 border-orange-500/30 text-orange-300'
                          }`}>
                            {order.status === 'Delivered' ? (t('orderStatus.delivered') || 'Delivered') : 
                             order.status === 'Shipped' ? (t('orderStatus.shipped') || 'Shipped') : 
                             (t('orderStatus.processing') || 'Processing')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-white/60">
                          <p>{order.date}</p>
                          <p>{order.items} Items • {order.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {status === 'loading' && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-6"
              >
                <div className="relative w-16 h-16">
                   <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                   <div className="absolute inset-0 rounded-full border-2 border-teal-400 border-t-transparent animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-teal-400">
                     <Package size={24} className="animate-pulse" />
                   </div>
                </div>
                <p className="text-teal-300 font-medium animate-pulse">{t('orderStatus.loading')}</p>
              </motion.div>
            )}

            {status === 'found' && (() => {
              const orderStatusStr = (orderData?.status || 'processing').toLowerCase();
              const isProcessed = orderStatusStr === 'processing' || orderStatusStr === 'shipped' || orderStatusStr === 'delivered';
              const isShipped = orderStatusStr === 'shipped' || orderStatusStr === 'delivered';
              const isDelivered = orderStatusStr === 'delivered';
              const progressBarWidth = isDelivered ? 'w-full' : isShipped ? 'w-1/2' : 'w-0';
              const itemsCount = (orderData?.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Truck size={80} />
                    </div>
                    
                    <div className="flex items-center gap-2 text-teal-300 mb-4">
                      <CheckCircle2 size={18} />
                      <span className="font-semibold text-sm uppercase tracking-wider">{t('orderStatus.found')}</span>
                    </div>

                    <h3 className="text-xl font-medium text-white mb-6 uppercase tracking-widest">{orderId}</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-white/50 mb-1">{t('orderStatus.eta') || 'Estimated Delivery'}</p>
                        <p className="text-sm font-medium text-white">
                          {isDelivered 
                            ? (t('orderStatus.delivered') || 'Delivered')
                            : orderData?.createdAt
                            ? new Date(new Date(orderData.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()
                            : '48-72 Hours'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50 mb-1">{t('orderStatus.status') || 'Current Status'}</p>
                        <div className="flex items-center gap-1.5 text-teal-300">
                          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                          <p className="text-sm font-medium text-capitalize">
                            {orderStatusStr === 'delivered' ? (t('orderStatus.delivered') || 'Delivered') : 
                             orderStatusStr === 'shipped' ? (t('orderStatus.shipped') || 'Shipped') : 
                             (t('orderStatus.processing') || 'Processing')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-white/50 mb-1">{t('orderStatus.carrier') || 'Carrier'}</p>
                        <p className="text-sm font-medium text-white">Yalidine Express (COD)</p>
                      </div>
                      <div>
                          <p className="text-xs text-white/50 mb-1">{t('orderStatus.items') || 'Items'}</p>
                          <p className="text-sm font-medium text-white">{itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-8">
                       <div className="flex justify-between items-end mb-2 relative z-10 px-2">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle2 size={20} className={isProcessed ? "text-teal-400" : "text-white/30"} />
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isProcessed ? "text-teal-400" : "text-white/30"}`}>{t('orderStatus.processing') || 'Processing'}</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <Truck size={20} className={isShipped ? "text-teal-400" : "text-white/30"} />
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isShipped ? "text-teal-400" : "text-white/30"}`}>{t('orderStatus.shipped') || 'Shipped'}</span>
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <Package size={20} className={isDelivered ? "text-teal-400" : "text-white/30"} />
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${isDelivered ? "text-teal-400" : "text-white/30"}`}>{t('orderStatus.delivered') || 'Delivered'}</span>
                          </div>
                       </div>
                       <div className="relative px-6">
                         <div className="absolute top-1/2 -translate-y-1/2 left-8 right-8 h-1 bg-white/10 rounded-full z-0"></div>
                         <div className={`absolute top-1/2 -translate-y-1/2 left-8 right-8 h-1 bg-teal-400 rounded-full z-0 ${progressBarWidth} transition-all duration-1000 shadow-[0_0_10px_rgba(45,212,191,0.5)]`}></div>
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={exportPDF}
                      className="flex-1 px-6 py-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-300 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <FileDown size={18} />
                      {t('orderStatus.exportPdf') || 'Export PDF'}
                    </button>
                    <button 
                      onClick={handleClose}
                      className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors text-sm font-medium"
                    >
                      {t('orderStatus.close') || 'Close'}
                    </button>
                  </div>
                </motion.div>
              );
            })()}

            {/* Hidden printable invoice */}
            {status === 'found' && (
              <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
                <div 
                  ref={invoiceRef}
                  className="bg-white p-12" 
                  style={{ width: '800px', direction: isRTL ? 'rtl' : 'ltr', fontFamily: isRTL ? 'var(--font-arabic)' : 'var(--font-sans)', color: '#000' }}
                >
                  <div className="flex justify-between items-start mb-12">
                    <div>
                      <h1 className="text-4xl font-bold text-emerald-950 mb-2">{t('invoice.title') || 'Order Invoice'}</h1>
                      <p className="text-gray-500 text-lg uppercase tracking-widest">{orderId}</p>
                      <p className="text-gray-500 mt-2">
                        {orderData?.createdAt 
                          ? new Date(orderData.createdAt).toLocaleDateString() 
                          : new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                       <div className={`w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                         <Package size={24} />
                       </div>
                       <p className="font-bold text-2xl mt-4 text-emerald-950">Joamedic</p>
                       <p className="text-gray-500">contact@joamedic.com</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 mb-12 pb-8 border-b border-gray-200">
                     <div>
                        <p className="text-sm text-gray-500 uppercase tracking-widest mb-3">{t('checkout.shipping') || 'Shipping Information'}</p>
                        <p className="font-medium text-lg text-emerald-950 mb-1">{orderData?.shippingInfo?.name || 'Customer'}</p>
                        <p className="text-gray-600">{orderData?.shippingInfo?.address || 'N/A'}</p>
                        <p className="text-gray-600">{orderData?.shippingInfo?.city || ''} {orderData?.shippingInfo?.wilaya || ''}</p>
                        <p className="text-gray-600">Tel: {orderData?.shippingInfo?.phone || ''}</p>
                     </div>
                     <div>
                        <p className="text-sm text-gray-500 uppercase tracking-widest mb-3">{t('orderStatus.status') || 'Status'}</p>
                        <p className="font-medium text-lg text-emerald-950 mb-1 capitalize">
                          {orderData?.status || 'processing'}
                        </p>
                        <p className="text-gray-600">{t('orderStatus.carrier') || 'Carrier'}: Yalidine Express (COD)</p>
                     </div>
                  </div>

                  <table className="w-full mb-12 animate-fade" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                     <thead className="border-b-2 border-gray-300">
                        <tr>
                           <th className="py-4 text-gray-600 font-medium">{t('orderStatus.itemsOrdered') || 'Items Ordered'}</th>
                           <th className={`py-4 text-gray-600 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{t('cart.total') || 'Total'}</th>
                        </tr>
                     </thead>
                     <tbody>
                        {(orderData?.items || []).map((item: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                             <td className="py-5 font-medium text-emerald-950 text-wrap">
                               {item.name}
                               {item.size ? ` (${item.size})` : ''}
                               {item.personalization?.text ? ` [Custom: ${item.personalization.text}]` : ''}
                               <span className="text-gray-400 font-normal"> (x{item.quantity})</span>
                             </td>
                             <td className={`py-5 text-gray-700 ${isRTL ? 'text-left' : 'text-right'}`}>{item.price * item.quantity} DA</td>
                          </tr>
                        ))}
                     </tbody>
                     <tfoot>
                        <tr>
                           <td className={`py-6 font-bold text-xl text-emerald-950 ${isRTL ? 'text-left' : 'text-right'} pr-4`}>{t('cart.total') || 'Total'}</td>
                           <td className={`py-6 font-bold text-xl text-emerald-950 ${isRTL ? 'text-left' : 'text-right'}`}>{orderData?.total || 0} DA</td>
                        </tr>
                     </tfoot>
                  </table>

                  <div className="mt-20 pt-8 border-t border-gray-200 text-center">
                    <p className="text-gray-400 font-medium">{t('foot.rights') || 'Joamedic Prestige Uniforms. All rights reserved.'}</p>
                    <p className="text-gray-400 mt-2 text-sm">{t('foot.desc')}</p>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
