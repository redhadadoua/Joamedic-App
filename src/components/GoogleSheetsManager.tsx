import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Loader, 
  ArrowUpRight, 
  Power, 
  AlertCircle, 
  Database, 
  RefreshCw, 
  FileDown, 
  FileUp,
  Check,
  ExternalLink,
  Info,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot, writeBatch, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface SheetsConfig {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  webAppUrl: string | null;
  autoSyncOrders: boolean;
  lastSyncedAt: string | null;
}

interface LocalOrder {
  id: string;
  total: number;
  status: string;
  createdAt?: any;
  shippingInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    wilaya?: string;
    city?: string;
    address?: string;
  };
  items?: Array<{
    name: string;
    size?: string;
    quantity?: number;
    price?: string;
  }>;
}

export default function GoogleSheetsManager() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState<SheetsConfig>({
    spreadsheetId: '1qbqMGXqA_HPFpYvpjn2XPJNKwnfXQRscrXKkxDMBR8M',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1qbqMGXqA_HPFpYvpjn2XPJNKwnfXQRscrXKkxDMBR8M/edit',
    spreadsheetTitle: 'joamedic',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbxfimh_5IRjnTlnXW_v9SJ9uQ5gqzcWlUe-bw5YjXLB6YCjTIiahFgvOjd0g6A5wpXGFQ/exec',
    autoSyncOrders: true,
    lastSyncedAt: null,
  });
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [pullingOrders, setPullingOrders] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [singleSyncId, setSingleSyncId] = useState<string | null>(null);
  
  // Real-time Orders local lookup
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderQuery, setOrderQuery] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [manualSheetId, setManualSheetId] = useState('');
  const [webAppUrlInput, setWebAppUrlInput] = useState('');
  const [showScriptInfo, setShowScriptInfo] = useState(false);

  // 1. Fetch Google Sheets integration configurations
  useEffect(() => {
    const loadConfigAndOrders = async () => {
      try {
        const docRef = doc(db, 'settings', 'google_sheets');
        const docSnap = await getDoc(docRef);
        const defaultConfig: SheetsConfig = {
          spreadsheetId: '1qbqMGXqA_HPFpYvpjn2XPJNKwnfXQRscrXKkxDMBR8M',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1qbqMGXqA_HPFpYvpjn2XPJNKwnfXQRscrXKkxDMBR8M/edit',
          spreadsheetTitle: 'joamedic',
          webAppUrl: 'https://script.google.com/macros/s/AKfycbxfimh_5IRjnTlnXW_v9SJ9uQ5gqzcWlUe-bw5YjXLB6YCjTIiahFgvOjd0g6A5wpXGFQ/exec',
          autoSyncOrders: true,
          lastSyncedAt: null,
        };

        if (docSnap.exists()) {
          const loadedData = docSnap.data();
          const mergedConfig: SheetsConfig = {
            spreadsheetId: loadedData.spreadsheetId || defaultConfig.spreadsheetId,
            spreadsheetUrl: loadedData.spreadsheetUrl || defaultConfig.spreadsheetUrl,
            spreadsheetTitle: loadedData.spreadsheetTitle || defaultConfig.spreadsheetTitle,
            webAppUrl: loadedData.webAppUrl || defaultConfig.webAppUrl,
            autoSyncOrders: loadedData.autoSyncOrders !== undefined ? loadedData.autoSyncOrders : defaultConfig.autoSyncOrders,
            lastSyncedAt: loadedData.lastSyncedAt || null,
          };
          setConfig(mergedConfig);
          setWebAppUrlInput(mergedConfig.webAppUrl || '');
        } else {
          setConfig(defaultConfig);
          setWebAppUrlInput(defaultConfig.webAppUrl || '');
          try {
            await setDoc(docRef, defaultConfig);
          } catch (writeErr) {
            console.warn("Could not write default sheets config to Firestore (might be offline):", writeErr);
          }
        }
      } catch (err) {
        console.warn('Error fetching Google Sheets configuration:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfigAndOrders();
  }, []);

  // 2. Load live orders from database to view inside this tab
  useEffect(() => {
    setLoadingOrders(true);
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list: LocalOrder[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LocalOrder);
      });
      setOrders(list);
      setLoadingOrders(false);
    }, (err) => {
      console.warn("Error loading live orders in sheet view:", err);
      // Fallback
      getDocs(collection(db, 'orders')).then((snap) => {
        const list: LocalOrder[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as LocalOrder));
        setOrders(list);
      }).finally(() => setLoadingOrders(false));
    });

    return () => unsubscribe();
  }, []);

  // Save current config to Firestore
  const saveConfig = async (newConfig: SheetsConfig) => {
    try {
      const docRef = doc(db, 'settings', 'google_sheets');
      await setDoc(docRef, newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error('Error saving Google Sheets configuration:', err);
      setError('Could not persist sheet configuration inside Firestore database.');
    }
  };

  // Google OAuth Auth Code
  const connectGoogleSheets = async () => {
    setError(null);
    setConnecting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        throw new Error('Could not acquire your Google Sheets authorization token.');
      }
      
      setAccessToken(token);
      setSuccessMsg(`Google connection authenticated! Logged in as ${result.user.displayName || result.user.email}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let friendly = err?.message || 'Authentication failed. Please verify popup blocker settings.';
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked') || err.message?.includes('popup_blocked')) {
        friendly = 'The authentication popup was blocked by your browser\'s security. This happens inside nested preview modes. Please open Joamedic in a new tab by copying the browser URL, or authorize Popups to complete connection.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        friendly = 'The login window was closed before completion. Please try connecting Google Sheets again.';
      }
      setError(friendly);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSheets = () => {
    setAccessToken(null);
    setError(null);
    setSuccessMsg('Disconnected Google token successfully.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleSaveWebhook = async () => {
    try {
      const updatedConfig = { ...config, webAppUrl: webAppUrlInput || null };
      await saveConfig(updatedConfig);
      setSuccessMsg('Webhook URL saved successfully! Syncs will now route through Apps Script Web App.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError('Could not save Webhook configuration.');
    }
  };

  // Discover or Create Spreadsheet 'joamedic'
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      setError('Please connect Google Sheets first to authorize Drive.');
      return;
    }
    
    setError(null);
    setCreatingSheet(true);
    try {
      // Search for any existing spreadsheet exactly titled 'joamedic'
      const queryStr = encodeURIComponent("name = 'joamedic' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryStr}&fields=files(id,name,webViewLink)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      let spreadsheetId = null;
      let spreadsheetUrl = null;
      let spreadsheetTitle = null;

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const existingFile = searchData.files[0];
          spreadsheetId = existingFile.id;
          spreadsheetUrl = existingFile.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          spreadsheetTitle = existingFile.name;
        }
      }

      if (spreadsheetId) {
        const updatedConfig: SheetsConfig = {
          ...config,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetTitle,
        };
        await saveConfig(updatedConfig);
        setSuccessMsg(`Found and linked your existing Google Drive spreadsheet "joamedic" successfully!`);
        setTimeout(() => setSuccessMsg(null), 5000);
        return;
      }

      // Create new
      const res = await fetch('https://sheets.googleapis.com/sheets/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'joamedic'
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error?.message || 'Failed creating new Spreadsheet');
      }

      const rawData = await res.json();
      const newSpreadsheetId = rawData.spreadsheetId;
      const newSpreadsheetUrl = rawData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;

      // Setup initial sheet tabs: Products and Orders
      await fetch(`https://sheets.googleapis.com/sheets/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            { updateSheetProperties: { properties: { sheetId: 0, title: 'Products' }, fields: 'title' } },
            { addSheet: { properties: { title: 'Orders' } } }
          ]
        })
      }).catch((e) => console.log('Tabs initialization skipped: ', e));

      const updatedConfig: SheetsConfig = {
        ...config,
        spreadsheetId: newSpreadsheetId,
        spreadsheetUrl: newSpreadsheetUrl,
        spreadsheetTitle: 'joamedic',
      };

      await saveConfig(updatedConfig);
      setSuccessMsg('Created and initialized a new "joamedic" Spreadsheet on your Google Drive!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error occurred while establishing Google Spreadsheet.');
    } finally {
      setCreatingSheet(false);
    }
  };

  // Link Spreadsheet manually by URL or ID
  const handleLinkManualSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetId.trim()) return;

    setError(null);
    let finalId = manualSheetId.trim();
    if (finalId.includes('spreadsheets/d/')) {
      const match = finalId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        finalId = match[1];
      }
    }

    try {
      const updatedConfig: SheetsConfig = {
        ...config,
        spreadsheetId: finalId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${finalId}/edit`,
        spreadsheetTitle: `Mapped Spreadsheet (${finalId.substring(0, 8)}...)`,
      };
      await saveConfig(updatedConfig);
      setManualSheetId('');
      setSuccessMsg('Manual spreadsheet linked successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError('Could not update spreadsheet links.');
    }
  };

  // Export Products list to Spreadsheet
  const handleSyncProducts = async () => {
    const useWebhook = !!config.webAppUrl;
    if (!useWebhook) {
      if (!accessToken) {
        setError('Please connect Google Sheets via Google Login first.');
        return;
      }
      if (!config.spreadsheetId) {
        setError('Please link a Spreadsheet first.');
        return;
      }
    }

    setError(null);
    setSyncingProducts(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const productRows: any[][] = [[
        'Product ID',
        'Name',
        'Category',
        'Price (DZD / DA)',
        'Original Color',
        'In Stock Balance',
        'Product Description',
        'Web Image Resource'
      ]];

      snap.forEach((docSnap) => {
        const p = docSnap.data();
        productRows.push([
          docSnap.id,
          p.name || '',
          p.category || '',
          p.price || '',
          p.color || '',
          p.stock !== undefined ? p.stock : 0,
          p.description || '',
          p.image || ''
        ]);
      });

      if (useWebhook) {
        const webhookRes = await fetch(config.webAppUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync_products', data: productRows })
        });
        if (!webhookRes.ok) throw new Error(`Webhook responded with code ${webhookRes.status}`);
        
        await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
        setSuccessMsg('Active clinical products pushed via Apps Script Webhook!');
        setTimeout(() => setSuccessMsg(null), 5000);
        return;
      }

      // OAuth API write to tab 'Products'
      const res = await fetch(
        `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/Products!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'Products!A1',
            majorDimension: 'ROWS',
            values: productRows
          })
        }
      );

      if (!res.ok) {
        // Fallback to Sheet1 or generic range
        await fetch(
          `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: 'A1', majorDimension: 'ROWS', values: productRows })
          }
        );
      }

      await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
      setSuccessMsg('Active Joamedic scrub catalog successfully exported!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error occurred exporting products.');
    } finally {
      setSyncingProducts(false);
    }
  };

  // Convert full Firestore orders snap to Google friendly rows
  const compileOrderRows = (ordersList: LocalOrder[]): any[][] => {
    const rows: any[][] = [[
      'Order ID',
      'Customer Name',
      'Customer Email',
      'Deliverable Phone',
      'Clinic / Station Address',
      'Order Total Amount',
      'Transaction Timestamp',
      'Fulfillment Status',
      'Purchased items detail'
    ]];

    ordersList.forEach((o) => {
      const itemsList = Array.isArray(o.items) 
        ? o.items.map((i: any) => `${i.name} (${i.size || 'N/A'}, Qty: ${i.quantity || 1})`).join('; ')
        : 'None';

      const addressParts = [];
      if (o.shippingInfo?.address) addressParts.push(o.shippingInfo.address);
      if (o.shippingInfo?.city) addressParts.push(o.shippingInfo.city);
      if (o.shippingInfo?.wilaya) addressParts.push(o.shippingInfo.wilaya);
      const finalAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

      let formattedDate = 'N/A';
      if (o.createdAt) {
        if (typeof o.createdAt.toDate === 'function') {
          formattedDate = o.createdAt.toDate().toISOString();
        } else if (o.createdAt.seconds) {
          formattedDate = new Date(o.createdAt.seconds * 1000).toISOString();
        } else {
          formattedDate = String(o.createdAt);
        }
      }

      rows.push([
        o.id,
        o.shippingInfo?.name || 'Clinician Member',
        o.shippingInfo?.email || 'N/A',
        o.shippingInfo?.phone || 'N/A',
        finalAddress,
        o.total || 0,
        formattedDate,
        o.status || 'pending',
        itemsList
      ]);
    });

    return rows;
  };

  // Export all Orders to Spreadsheet
  const handleSyncOrders = async () => {
    const useWebhook = !!config.webAppUrl;
    if (!useWebhook) {
      if (!accessToken) {
        setError('Please connect Google Sheets via Google Login first.');
        return;
      }
      if (!config.spreadsheetId) {
        setError('Please link a Spreadsheet first.');
        return;
      }
    }

    setError(null);
    setSyncingOrders(true);
    try {
      const orderRows = compileOrderRows(orders);

      if (useWebhook) {
        const webhookRes = await fetch(config.webAppUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync_orders', data: orderRows })
        });
        if (!webhookRes.ok) throw new Error(`Webhook failed: ${webhookRes.status}`);
        
        await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
        setSuccessMsg('Active clinical orders written to Spreadsheet via Apps Script Webhook!');
        setTimeout(() => setSuccessMsg(null), 5000);
        return;
      }

      // Write via OAuth
      const res = await fetch(
        `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/Orders!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'Orders!A1',
            majorDimension: 'ROWS',
            values: orderRows
          })
        }
      );

      if (!res.ok) {
        // Try generic fallback
        await fetch(
          `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: 'A1', majorDimension: 'ROWS', values: orderRows })
          }
        );
      }

      await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
      setSuccessMsg('All live customer orders successfully exported to Spreadsheet.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error occurred exporting orders.');
    } finally {
      setSyncingOrders(false);
    }
  };

  // Sync a single distinct order directly
  const handleSyncSingleOrder = async (orderId: string) => {
    const singleOrderObj = orders.find(o => o.id === orderId);
    if (!singleOrderObj) return;

    setError(null);
    setSingleSyncId(orderId);
    try {
      const useWebhook = !!config.webAppUrl;
      const parsedRows = compileOrderRows([singleOrderObj]);
      // Remove compiled headers row for single additions unless database empty
      const targetRow = parsedRows[1]; 

      if (useWebhook) {
        const webhookRes = await fetch(config.webAppUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'add_order', data: [targetRow] })
        });
        if (!webhookRes.ok) throw new Error('Webhook rejected this single order');
        setSuccessMsg(`Order #${orderId} synchronized to Google Sheets via Webhook!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      // OAuth single row insert (append range)
      if (!accessToken) {
        throw new Error('Connect Google Security first in this browser.');
      }
      if (!config.spreadsheetId) {
        throw new Error('Link active Spreadsheet first.');
      }

      const res = await fetch(
        `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/Orders!A:I:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            range: 'Orders!A:I',
            majorDimension: 'ROWS',
            values: [targetRow]
          })
        }
      );

      if (!res.ok) {
        throw new Error('Active Spreadsheet rejected appending rows.');
      }

      setSuccessMsg(`Order #${orderId} appended to Spreadsheet successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failure mapping specific single order.');
    } finally {
      setSingleSyncId(null);
    }
  };

  // Pull updates from Spreadsheet back into Firestore
  const handlePullOrders = async () => {
    if (!accessToken) {
      setError('Please connect Google Sheets first to enable read privilege.');
      return;
    }
    if (!config.spreadsheetId) {
      setError('Please choose or link a Spreadsheet first.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to pull order updates from Google Sheets? This will synchronize status and customer properties back into your live Firestore database.'
    );
    if (!confirmed) return;

    setError(null);
    setPullingOrders(true);
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/Orders!A2:I1000`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!res.ok) {
        throw new Error('Could not read the Orders tab. Check that it contains at least one order row.');
      }

      const data = await res.json();
      const rows = data.values;
      if (!rows || rows.length === 0) {
        setSuccessMsg('No orders discovered to update.');
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      let updated = 0;
      let created = 0;

      for (const row of rows) {
        const orderId = row[0];
        if (!orderId || typeof orderId !== 'string' || !orderId.trim()) continue;

        const customerName = row[1] || '';
        const customerEmail = row[2] || '';
        const customerPhone = row[3] || '';
        const address = row[4] || '';
        const totalStr = row[5] || '0';
        const total = parseFloat(totalStr.toString().replace(/[^0-9.]/g, '')) || 0;
        const createdAtStr = row[6] || new Date().toISOString();
        const status = (row[7] || 'processing').toLowerCase().trim();

        const orderRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(orderRef);

        if (docSnap.exists()) {
          const existing = docSnap.data();
          await setDoc(orderRef, {
            ...existing,
            status,
            total,
            shippingInfo: {
              ...(existing.shippingInfo || {}),
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address
            }
          }, { merge: true });
          updated++;
        } else {
          // Create new record
          await setDoc(orderRef, {
            userId: 'guest',
            total,
            status,
            shippingInfo: {
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address,
              city: 'Custom',
              wilaya: 'Custom'
            },
            createdAt: Timestamp.fromDate(new Date(createdAtStr))
          });
          created++;
        }
      }

      await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
      setSuccessMsg(`Google Sheets sync completed successfully! Updated: ${updated} orders, Created: ${created} orders.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error occurred pulling records from Google Sheets.');
    } finally {
      setPullingOrders(false);
    }
  };

  const handleSyncAll = async () => {
    if (!accessToken) {
      setError('Please connect Google Sheets first.');
      return;
    }
    setError(null);
    setSyncingProducts(true);
    setSyncingOrders(true);
    try {
      await handleSyncProducts();
      await handleSyncOrders();
      setSuccessMsg('Entire Joamedic store catalogs and logs fully synchronized to Google Sheets!');
    } catch (err: any) {
      setError(err?.message || 'Could not complete synchronization.');
    } finally {
      setSyncingProducts(false);
      setSyncingOrders(false);
    }
  };

  const unlinkSpreadsheet = async () => {
    const confirmUnlink = window.confirm('Disconnect this spreadsheet map? The file inside Google Drive will remain completely untouched.');
    if (!confirmUnlink) return;

    await saveConfig({
      ...config,
      spreadsheetId: null,
      spreadsheetUrl: null,
      spreadsheetTitle: null,
      lastSyncedAt: null,
    });
    setSuccessMsg('Google Spreadsheet reference cleared.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // CSV Generation backups
  const downloadProductsCSV = () => {
    try {
      const rows: string[][] = [
        ['Product ID', 'Name', 'Category', 'Price (DZD / DA)', 'Original Color', 'In Stock Balance', 'Product Description', 'Web Image Resource']
      ];
      // Draw rows locally
      getDocs(collection(db, 'products')).then((snap) => {
        snap.forEach((docSnap) => {
          const p = docSnap.data();
          rows.push([
            docSnap.id,
            p.name || '',
            p.category || '',
            p.price || '',
            p.color || '',
            p.stock !== undefined ? p.stock : '0',
            p.description || '',
            p.image || ''
          ]);
        });
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
          + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Joamedic_Products_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } catch (_) {
      setError("Failed to generate local Products CSV backup.");
    }
  };

  const downloadOrdersCSV = () => {
    try {
      const rows: string[][] = [
        ['Order ID', 'Customer Name', 'Customer Email', 'Customer Phone', 'Address', 'Total', 'Date Created', 'Status', 'Items List']
      ];
      orders.forEach((o) => {
        const itemsList = o.items && Array.isArray(o.items)
          ? o.items.map((i: any) => `${i.name} (${i.size || 'N/A'}, Qty: ${i.quantity || 1})`).join('; ')
          : 'None';

        const addressParts = [];
        if (o.shippingInfo?.address) addressParts.push(o.shippingInfo.address);
        if (o.shippingInfo?.city) addressParts.push(o.shippingInfo.city);
        if (o.shippingInfo?.wilaya) addressParts.push(o.shippingInfo.wilaya);
        const finalAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';

        rows.push([
          o.id,
          o.shippingInfo?.name || 'Guest',
          o.shippingInfo?.email || 'N/A',
          o.shippingInfo?.phone || 'N/A',
          finalAddress,
          o.total || 0,
          o.createdAt ? String(o.createdAt) : 'N/A',
          o.status || 'pending',
          itemsList
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Joamedic_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (_) {
      setError("Failed to generate local Orders CSV backup.");
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(orderQuery.toLowerCase()) ||
      (o.shippingInfo?.name && o.shippingInfo.name.toLowerCase().includes(orderQuery.toLowerCase())) ||
      (o.shippingInfo?.phone && o.shippingInfo.phone.includes(orderQuery))
  );

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white bg-slate-950 min-h-[300px]">
        <Loader className="animate-spin text-teal-400 mb-2" size={32} />
        <p className="text-sm text-white/50">Loading Google workspace registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Title */}
      <div className="bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white flex items-center gap-3">
          <FileSpreadsheet className="text-teal-400" size={30} /> Google Sheets Integration Hub
        </h1>
        <p className="text-xs text-white/60 mt-1.5 leading-relaxed max-w-3xl">
          Automated clinical bookkeeping. Manage individual medical apparel orders, search client entries, and synchronize products catalog directly to real-time Google Sheets.
        </p>

        {/* Authentication Frame Bypass Helper */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-teal-500/5 p-3 rounded-xl border border-teal-500/10">
          <div className="flex gap-2 text-xs text-teal-300">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p className="leading-normal">
              <strong>Iframe Context Tip:</strong> If Google Login fails to open because popups are restricted in nested frame sandboxes, click the button to open Joamedic in a dedicated tab.
            </p>
          </div>
          <button
            onClick={() => window.open(window.location.origin, '_blank')}
            className="px-3.5 py-1.5 bg-teal-500 text-black rounded-lg text-xs font-bold transition-all hover:bg-teal-400 inline-flex items-center gap-1.5 uppercase tracking-wider shrink-0"
          >
            Open in New Tab <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/15 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-3 text-xs"
          >
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-semibold text-red-200">Synchronization Error</p>
              <p className="text-white/70 mt-1 leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-start gap-3 text-xs"
          >
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-semibold text-emerald-200 font-display">Action Resolved</p>
              <p className="text-white/70 mt-0.5 leading-relaxed">{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-white/90">
              <Power size={16} className="text-teal-400" /> authorization
            </h3>

            {accessToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">Authorized & Connected</p>
                    <p className="text-[9px] text-white/40 mt-0.5 font-mono">Scope: spreadsheets, drive</p>
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed">
                  Authentication token is active. You can now synchronize, write, and modify spreadsheets directly.
                </p>

                <button
                  onClick={disconnectSheets}
                  className="w-full text-center py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                >
                  Disconnect Token
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-white/50 leading-relaxed">
                  Google Secure Login links our clinical databases to your personalized Spreadsheet files.
                </p>

                <button
                  onClick={connectGoogleSheets}
                  disabled={connecting}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {connecting ? <Loader size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                  Google Login
                </button>
              </div>
            )}
          </div>

          {/* Webhook Alternative */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg backdrop-blur-xl">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-white/90">
              <Database size={16} className="text-teal-400" /> Webhook Backup
            </h4>
            <p className="text-white/60 leading-normal text-[11px]">
              If browser policies disrupt Google Auth, bypass login by entering a Google Apps Script Web App URL below instead:
            </p>
            
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webAppUrlInput}
              onChange={(e) => setWebAppUrlInput(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-teal-400/50 text-white font-mono text-[11px] placeholder:text-white/20 transition-all hover:border-white/20"
            />
            
            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                onClick={() => setShowScriptInfo(!showScriptInfo)}
                className="text-teal-400 hover:text-teal-300 text-[10px] uppercase tracking-wider font-bold transition-colors"
              >
                {showScriptInfo ? "Hide Code" : "Script Code"}
              </button>
              
              <button
                onClick={handleSaveWebhook}
                className="px-4 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold transition-all shadow-md"
              >
                Save webapp
              </button>
            </div>
            
            <AnimatePresence>
              {showScriptInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-xl p-3 text-[10px] text-teal-100/70 font-mono overflow-auto max-h-56 mt-2 whitespace-pre"
                >
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  var rows = payload.data;
  
  if (action === 'sync_orders') {
    var ms = sheet.getSheetByName("Orders") || sheet.insertSheet("Orders");
    ms.clear();
    if(rows.length > 0) ms.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  } else if (action === 'add_order') {
    var ms = sheet.getSheetByName("Orders") || sheet.insertSheet("Orders");
    if(rows && rows.length > 0) ms.appendRow(rows[0]);
  } else if (action === 'sync_products') {
    var ps = sheet.getSheetByName("Products") || sheet.insertSheet("Products");
    ps.clear();
    if(rows.length > 0) ps.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  }
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column Core Workspace and Orders Synchronization Finder */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Target */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Database size={16} className="text-teal-400" /> target spreadsheet
            </h3>

            {config.spreadsheetId ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-[280px]">
                        {config.spreadsheetTitle || 'Registered Spreadsheet'}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5 font-mono truncate max-w-[280px]">
                        ID: {config.spreadsheetId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
                    >
                      <ExternalLink size={12} /> Open Sheet
                    </a>
                    
                    <button
                      onClick={unlinkSpreadsheet}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs font-medium transition-colors shrink-0"
                    >
                      Unlink
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-white/40">
                  <span>Target mapped correctly.</span>
                  {config.lastSyncedAt && (
                    <span className="font-mono text-teal-400/80">Last Sync: {config.lastSyncedAt}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl text-xs text-yellow-300/80 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  No spreadsheet mapped yet. Click "Use Spreadsheet joamedic" to auto-create, or provide a custom spreadsheet ID.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-white text-xs uppercase tracking-wider text-teal-400">Deploy "joamedic" Spreadsheet</p>
                      <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                        Searches your Drive for a checklist named "joamedic". If none is found, we automatically allocate and format a new spreadsheet.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSpreadsheet}
                      disabled={!accessToken || creatingSheet}
                      className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                    >
                      {creatingSheet ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
                      Use joamedic
                    </button>
                  </div>

                  <form onSubmit={handleLinkManualSpreadsheet} className="border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-white text-xs uppercase tracking-wider text-teal-400 font-display">manual link</p>
                      <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                        Manually link an existing sheet from your workspace by pasting its ID or full URL below:
                      </p>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="Spreadsheet URL or ID"
                        value={manualSheetId}
                        onChange={(e) => setManualSheetId(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-white flex-1 min-w-0"
                      />
                      <button
                        type="submit"
                        disabled={!manualSheetId.trim()}
                        className="px-3 bg-teal-500/20 hover:bg-teal-500 border border-teal-500/20 text-teal-300 hover:text-black rounded-lg text-xs font-bold"
                      >
                        Map
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Rebuilt Search & Manage & Synchronize Orders Area */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                  <Search size={16} className="text-teal-400" /> Manage & Synchronize Orders
                </h3>
                <p className="text-xs text-white/40 mt-0.5">Filter the clinical database and push distinct order logs onto Sheets manually.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleSyncOrders}
                  disabled={syncingOrders || (!accessToken && !config.webAppUrl)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-500 text-black text-xs font-bold rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  {syncingOrders ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sync All Orders
                </button>
                <button
                  onClick={handleSyncProducts}
                  disabled={syncingProducts || (!accessToken && !config.webAppUrl)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 border border-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  {syncingProducts ? <Loader size={12} className="animate-spin" /> : <Database size={12} />}
                  Sync Products
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search orders in sheets section by ID, Customer Name, or Phone..."
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-teal-400/50 transition-colors placeholder:text-white/30 text-white"
              />
            </div>

            {/* Orders Table inside Google Sheets Tab */}
            {loadingOrders ? (
              <div className="flex justify-center items-center py-10">
                <Loader className="animate-spin text-teal-400 mr-2" size={20} />
                <span className="text-xs text-white/50 font-mono">Scanning live order files...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="border border-white/5 bg-white/5 rounded-xl text-center py-10 text-xs text-white/40">
                No orders discovered matching search filter "{orderQuery}".
              </div>
            ) : (
              <div className="border border-white/15 bg-slate-900/40 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                <table className="w-full text-left text-xs text-white/80">
                  <thead className="bg-white/5 border-b border-white/10 font-semibold text-white/60 sticky top-0 bg-slate-900 z-10">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Total (DA)</th>
                      <th className="px-4 py-3">Fulfillment</th>
                      <th className="px-4 py-3 text-right">Synchronization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-teal-400">{ord.id}</td>
                        <td className="px-4 py-3 font-sans truncate max-w-[140px]" title={ord.shippingInfo?.name}>
                          {ord.shippingInfo?.name || 'Guest User'}
                        </td>
                        <td className="px-4 py-3 text-white/90">{ord.total ? ord.total.toLocaleString() : '0'} DA</td>
                        <td className="px-4 py-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            ord.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
                            ord.status === 'shipped' ? 'bg-blue-500/20 text-blue-300' :
                            ord.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                            'bg-teal-500/20 text-teal-300'
                          }`}>
                            {ord.status || 'processing'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-sans">
                          <button
                            onClick={() => handleSyncSingleOrder(ord.id)}
                            disabled={singleSyncId !== null || (!accessToken && !config.webAppUrl)}
                            className="px-2.5 py-1 text-[10px] bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-black font-bold uppercase rounded-md transition-all border border-teal-500/20 disabled:opacity-40"
                          >
                            {singleSyncId === ord.id ? (
                              <Loader size={10} className="animate-spin inline mr-1" />
                            ) : (
                              <ArrowRight size={10} className="inline mr-1" />
                            )}
                            Sync Row
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sync operations list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <RefreshCw size={16} className="text-teal-400" /> Administrative Sheets Control
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Import Statuses from Sheet</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">Pull order adjustments edited directly inside Google Sheets.</p>
                </div>
                <button
                  onClick={handlePullOrders}
                  disabled={!accessToken || !config.spreadsheetId || pullingOrders}
                  className="flex items-center gap-1 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-bold uppercase transition-all disabled:opacity-30 shrink-0"
                >
                  {pullingOrders ? <Loader size={12} className="animate-spin" /> : <FileUp size={12} />}
                  Pull Orders
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">CSV Spreadsheet Backup</h4>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">Download local CSV backups of the clinical registry instantly.</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={downloadProductsCSV}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white"
                    title="Export Products CSV"
                  >
                    <FileDown size={14} className="text-teal-400" />
                  </button>
                  <button
                    onClick={downloadOrdersCSV}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white"
                    title="Export Orders CSV"
                  >
                    <FileDown size={14} className="text-blue-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
