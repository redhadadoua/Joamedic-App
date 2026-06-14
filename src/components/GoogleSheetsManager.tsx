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
  Info
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface SheetsConfig {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string | null;
  webAppUrl: string | null;
  autoSyncOrders: boolean;
  lastSyncedAt: string | null;
}

export default function GoogleSheetsManager() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [config, setConfig] = useState<SheetsConfig>({
    spreadsheetId: null,
    spreadsheetUrl: null,
    spreadsheetTitle: null,
    webAppUrl: null,
    autoSyncOrders: false,
    lastSyncedAt: null,
  });
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [pullingOrders, setPullingOrders] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [manualSheetId, setManualSheetId] = useState('');
  const [webAppUrlInput, setWebAppUrlInput] = useState('');
  const [showScriptInfo, setShowScriptInfo] = useState(false);

  // 1. Load configuration from Firestore doc settings/google_sheets
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'google_sheets');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const loadedConfig = docSnap.data() as SheetsConfig;
          setConfig(loadedConfig);
          if (loadedConfig.webAppUrl) {
            setWebAppUrlInput(loadedConfig.webAppUrl);
          }
        }
      } catch (err) {
        console.error('Error fetching Google Sheets configuration:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, []);

  // Save current config to Firestore
  const saveConfig = async (newConfig: SheetsConfig) => {
    try {
      const docRef = doc(db, 'settings', 'google_sheets');
      await setDoc(docRef, newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error('Error saving Google Sheets configuration to Firestore:', err);
      setError('Could not persist sheet configuration inside Firestore database.');
    }
  };

  // 2. Connect Google Sheets with the correct spreadsheets & drive scope
  const connectGoogleSheets = async () => {
    setError(null);
    setConnecting(true);
    try {
      const provider = new GoogleAuthProvider();
      // Add spreadsheets and drive scopes
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        throw new Error('Could not acquire your Google Sheets authorization token.');
      }
      
      setAccessToken(token);
      setSuccessMsg(`Google Sheets authenticated successfully! Connected as ${result.user.displayName || result.user.email}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let friendly = err?.message || 'Authentication failed. Please verify popup blocker settings.';
      if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked') || err.message?.includes('popup_blocked')) {
        friendly = 'The Google Sheets authentication popup was blocked by your browser\'s security or because of sandboxing. Please allow popups for this page, or open the app in a new tab using the URL in your browser\'s address bar.';
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        friendly = 'The Google Sheets authorization window was closed before it completed. Please try connecting Google Sheets again and complete the login flow.';
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        friendly = 'The authentication request was cancelled or superseded by another request. Please try again.';
      }
      setError(friendly);
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect OAuth & Sheet Link
  const disconnectSheets = () => {
    setAccessToken(null);
    setError(null);
    setSuccessMsg('Disconnected Google token successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
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

  // 3. Smart Search & Find or Create Spreadsheet named 'joamedic'
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      setError('Please connect Google Sheets first to authorize Drive.');
      return;
    }
    
    setError(null);
    setCreatingSheet(true);
    try {
      // Step A: Search for any spreadsheet exactly titled 'joamedic' or 'Joamedic'
      const query = encodeURIComponent("name = 'joamedic' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
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
          // Found existing joamedic sheet!
          const existingFile = searchData.files[0];
          spreadsheetId = existingFile.id;
          spreadsheetUrl = existingFile.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          spreadsheetTitle = existingFile.name;
        }
      }

      if (spreadsheetId) {
        // Link the existing spreadsheet directly
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

      // If not discovered, create a brand new spreadsheet named 'joamedic'
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

      // Step B: Set up core tabs Products and Orders, renaming Sheet1 to Products
      const setupRes = await fetch(`https://sheets.googleapis.com/sheets/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: 0,
                  title: 'Products'
                },
                fields: 'title'
              }
            },
            {
              addSheet: {
                properties: {
                  title: 'Orders'
                }
              }
            }
          ]
        })
      });

      if (!setupRes.ok) {
        console.warn('Initial tab renaming failed (some older Google configurations might not support index 0 renaming). Proceeding with default structure.');
      }

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
      let errMsg = err?.message || 'Error occurred while establishing Google Spreadsheet.';
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('fetch'))) {
        errMsg = 'Failed to reach Google APIs (Failed to fetch). This usually happens if a browser ad-blocker, Brave Shields, or privacy/security extension is restricting requests to Google\'s API servers, or Google Sheets/Drive scopes are not permitted. Please disable active blockers for this tab or try manually mapping your sheet.';
      }
      setError(errMsg);
    } finally {
      setCreatingSheet(false);
    }
  };

  // Set Spreadsheet manually by ID or URL
  const handleLinkManualSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetId.trim()) return;

    setError(null);
    // Parse Google Sheets full URL or keep raw ID
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
        spreadsheetTitle: `Linked Sheet (${finalId.substring(0, 8)}...)`,
      };
      await saveConfig(updatedConfig);
      setManualSheetId('');
      setSuccessMsg('Manual spreadsheet linked successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError('Could not update spreadsheet links.');
    }
  };

  // 4. Export Products database to Sheet Tab
  const handleSyncProducts = async () => {
    const useWebhook = !!config.webAppUrl;
    if (!useWebhook) {
      if (!accessToken) {
        setError('Please connect Google Sheets via OAuth or configure a Webhook URL.');
        return;
      }
      if (!config.spreadsheetId) {
        setError('Please connect or create a Spreadsheet first.');
        return;
      }
    }

    setError(null);
    setSyncingProducts(true);
    try {
      // Query Firestore products
      const snap = await getDocs(collection(db, 'products'));
      const productRows: any[][] = [];
      
      // Header values
      productRows.push([
        'Product ID',
        'Name',
        'Category',
        'Price (DZD / DA)',
        'Original Color',
        'In Stock Balance',
        'Product Description',
        'Web Image Resource'
      ]);

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
        // Send products via Apps Script Webhook
        const webhookRes = await fetch(config.webAppUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync_products', data: productRows })
        });
        if (!webhookRes.ok) throw new Error(`Webhook failed with status ${webhookRes.status}`);
        const result = await webhookRes.json().catch(() => ({}));
        if (result.error) throw new Error(result.error);
        
        await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
        setSuccessMsg('Active clinical apparel product catalogs pushed via Apps Script Webhook!');
        setTimeout(() => setSuccessMsg(null), 5000);
        return;
      }

      // Write values to Products Tab
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
        // Fallback: Check if they are writing to an default Sheet1 layout or tab issue
        const fallbackRes = await fetch(
          `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: 'A1',
              majorDimension: 'ROWS',
              values: productRows
            })
          }
        );
        if (!fallbackRes.ok) {
          throw new Error('Google Spreadsheet refused database payload. Make sure your sheet ID is typing-correct and has edit writes.');
        }
      }

      const now = new Date().toLocaleString();
      const updatedConfig: SheetsConfig = {
        ...config,
        lastSyncedAt: now
      };
      await saveConfig(updatedConfig);
      setSuccessMsg('Active clinical apparel product catalogs written to Spreadsheet flawlessly!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      let errMsg = err?.message || 'Error occurred exporting products lists.';
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('fetch'))) {
        errMsg = 'Failed to reach Google APIs (Failed to fetch) while exporting products. Please verify your internet connection and check if sheets.googleapis.com is allowed inside your ad-blocker/firewall Settings.';
      }
      setError(errMsg);
    } finally {
      setSyncingProducts(false);
    }
  };

  // 5. Export Orders database to Sheet Tab
  const handleSyncOrders = async () => {
    const useWebhook = !!config.webAppUrl;
    if (!useWebhook) {
      if (!accessToken) {
        setError('Please connect Google Sheets via OAuth or configure a Webhook URL.');
        return;
      }
      if (!config.spreadsheetId) {
        setError('Please connect or create a Spreadsheet first.');
        return;
      }
    }

    setError(null);
    setSyncingOrders(true);
    try {
      // Query Firestore orders
      const snap = await getDocs(collection(db, 'orders'));
      const orderRows: any[][] = [];
      
      // Header values
      orderRows.push([
        'Order ID',
        'Customer Name',
        'Customer Email',
        'Deliverable Phone',
        'Clinie / Station Address',
        'Order Total Amount',
        'Transaction Timestamp',
        'Fulfillment Status',
        'Purchased items detail'
      ]);

      snap.forEach((docSnap) => {
        const o = docSnap.data();
        
        // Custom formatting for purchased items list
        const itemsList = Array.isArray(o.items) 
          ? o.items.map((i: any) => `${i.name} (Color: ${i.color || 'N/A'}, Size: ${i.size || 'N/A'}, Qty: ${i.quantity || 1})`).join('; ')
          : 'None';

        // Extract and construct beautiful readable address
        const addressParts = [];
        if (o.shippingInfo?.address) addressParts.push(o.shippingInfo.address);
        if (o.shippingInfo?.city) addressParts.push(o.shippingInfo.city);
        if (o.shippingInfo?.wilaya) addressParts.push(o.shippingInfo.wilaya);
        const finalAddress = addressParts.length > 0 
          ? addressParts.join(', ') 
          : (o.shippingAddress?.address || 'N/A');

        // Safely extract and format Timestamp
        let formattedDate = 'N/A';
        if (o.createdAt) {
          if (typeof o.createdAt.toDate === 'function') {
            formattedDate = o.createdAt.toDate().toISOString();
          } else if (o.createdAt.seconds) {
            formattedDate = new Date(o.createdAt.seconds * 1000).toISOString();
          } else {
            formattedDate = String(o.createdAt);
          }
        } else if (o.timestamp) {
          if (typeof o.timestamp.toDate === 'function') {
            formattedDate = o.timestamp.toDate().toISOString();
          } else {
            formattedDate = String(o.timestamp);
          }
        }

        orderRows.push([
          docSnap.id,
          o.shippingInfo?.name || o.shippingAddress?.fullName || o.customerName || 'Clinician Member',
          o.shippingInfo?.email || o.shippingAddress?.email || o.customerEmail || 'N/A',
          o.shippingInfo?.phone || o.shippingAddress?.phone || o.customerPhone || 'N/A',
          finalAddress,
          o.total || '0 DA',
          formattedDate,
          o.status || 'pending',
          itemsList
        ]);
      });

      if (useWebhook) {
        // Send orders via Apps Script Webhook
        const webhookRes = await fetch(config.webAppUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'sync_orders', data: orderRows })
        });
        if (!webhookRes.ok) throw new Error(`Webhook failed with status ${webhookRes.status}`);
        const result = await webhookRes.json().catch(() => ({}));
        if (result.error) throw new Error(result.error);
        
        await saveConfig({ ...config, lastSyncedAt: new Date().toLocaleString() });
        setSuccessMsg('Active clinical orders written to Spreadsheet via Apps Script Webhook!');
        setTimeout(() => setSuccessMsg(null), 5000);
        return;
      }

      // Write values to Orders Tab
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
        // Fallback: If Orders tab doesn't exist, try appending or writing to any generic sheet
        setError('Ensure that an "Orders" sheet tab is present inside your Spreadsheet. We are retrying on fallback range.');
        await fetch(
          `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: 'A1',
              majorDimension: 'ROWS',
              values: orderRows
            })
          }
        );
      }

      const now = new Date().toLocaleString();
      const updatedConfig: SheetsConfig = {
        ...config,
        lastSyncedAt: now
      };
      await saveConfig(updatedConfig);
      setSuccessMsg('Active clinic client transaction purchase records written to your Spreadsheet!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      let errMsg = err?.message || 'Error occurred exporting order sheets.';
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('fetch'))) {
        errMsg = 'Failed to reach Google Sheets API (Failed to fetch) while syncing orders. Please ensure any browser blockers or Brave Shields are disabled, and check your internet connection.';
      }
      setError(errMsg);
    } finally {
      setSyncingOrders(false);
    }
  };

  // 6. Pull / Import & Update Orders from Spreadsheet
  const handlePullOrders = async () => {
    if (!accessToken) {
      setError('Please connect Google Sheets first.');
      return;
    }
    if (!config.spreadsheetId) {
      setError('Please connect or create a Spreadsheet first.');
      return;
    }

    // MANDATORY confirmation dialog for destructive or mutating database operations
    const confirmed = window.confirm(
      'Are you sure you want to pull order updates from Google Sheets? This will update Firestore order parameters (status, customer info, addresses, and price totals) with the current spreadsheet details.'
    );
    if (!confirmed) return;

    setError(null);
    setPullingOrders(true);
    try {
      // Read values from 'Orders' sheet tab, skipping header row
      const res = await fetch(
        `https://sheets.googleapis.com/sheets/v4/spreadsheets/${config.spreadsheetId}/values/Orders!A2:I1000`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!res.ok) {
        throw new Error('Could not read the "Orders" sheet tab. Verify that the Orders tab has at least one order transaction row.');
      }

      const data = await res.json();
      const rows = data.values;
      if (!rows || rows.length === 0) {
        setSuccessMsg('No active order data rows discovered inside the Spreadsheet.');
        setTimeout(() => setSuccessMsg(null), 4000);
        return;
      }

      let updatedCount = 0;
      let createdCount = 0;

      for (const row of rows) {
        const orderId = row[0];
        if (!orderId || typeof orderId !== 'string' || !orderId.trim()) continue;

        const customerName = row[1] || '';
        const customerEmail = row[2] || '';
        const customerPhone = row[3] || '';
        const address = row[4] || '';
        const totalStr = row[5] || '0';
        // Clean currency or text delimiters (e.g. "4500 DA" -> 4500)
        const total = parseFloat(totalStr.toString().replace(/[^0-9.]/g, '')) || 0;
        const createdAtStr = row[6] || new Date().toISOString();
        const status = (row[7] || 'processing').toLowerCase().trim();
        const itemsStr = row[8] || '';

        const orderRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(orderRef);

        if (docSnap.exists()) {
          const existingData = docSnap.data();
          await setDoc(orderRef, {
            ...existingData,
            status: status,
            total: total,
            shippingInfo: {
              ...(existingData.shippingInfo || {}),
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address: address
            }
          }, { merge: true });
          updatedCount++;
        } else {
          // Parse list of custom items if present or default
          const parsedId = Math.floor(10000 + Math.random() * 90000);
          const parsedItems = itemsStr ? [{
            id: parsedId,
            name: itemsStr.substring(0, 120),
            price: total.toString(),
            quantity: 1,
            size: 'Custom',
            personalization: null
          }] : [{
            id: parsedId,
            name: 'Clinique Premium Apparel Set',
            price: total.toString(),
            quantity: 1,
            size: 'Custom',
            personalization: null
          }];

          let parsedDate;
          try {
            parsedDate = new Date(createdAtStr);
            if (isNaN(parsedDate.getTime())) {
              parsedDate = new Date();
            }
          } catch {
            parsedDate = new Date();
          }

          await setDoc(orderRef, {
            userId: 'guest',
            items: parsedItems,
            total,
            status,
            shippingInfo: {
              name: customerName,
              phone: customerPhone,
              email: customerEmail,
              address: address,
              city: 'Custom',
              wilaya: 'Custom'
            },
            createdAt: Timestamp.fromDate(parsedDate)
          });
          createdCount++;
        }
      }

      const now = new Date().toLocaleString();
      const updatedConfig: SheetsConfig = {
        ...config,
        lastSyncedAt: now
      };
      await saveConfig(updatedConfig);

      setSuccessMsg(`Google Sheets control sync completed! Updated: ${updatedCount} orders, Created: ${createdCount} orders.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      let errMsg = err?.message || 'Error occurred pulling records from Google Sheets.';
      if (typeof errMsg === 'string' && (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('fetch'))) {
        errMsg = 'Failed to reach Google Sheets API (Failed to fetch) while pulling records. This usually indicates Google APIs are being restricted by your browser ad-blocker or network settings.';
      }
      setError(errMsg);
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
      setSuccessMsg('Entire Joamedic store catalog and transaction logs fully synchronized on Google Sheets!');
    } catch (err: any) {
      setError(err?.message || 'Could not complete synchronization.');
    } finally {
      setSyncingProducts(false);
      setSyncingOrders(false);
    }
  };

  const unlinkSpreadsheet = async () => {
    const confirmUnlink = window.confirm('Deregister and disconnect this spreadsheet? The existing file inside Google Drive will not be touched.');
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

  // CSV Fallback export for Products catalog
  const downloadProductsCSV = async () => {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const rows: string[][] = [
        ['Product ID', 'Name', 'Category', 'Price (DZD / DA)', 'Original Color', 'In Stock Balance', 'Product Description', 'Web Image Resource']
      ];
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
      link.setAttribute("download", `Joamedic_Products_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMsg("Products catalog successfully exported as local CSV file!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate local Products CSV backup.");
    }
  };

  // CSV Fallback export for Orders transactions
  const downloadOrdersCSV = async () => {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const rows: string[][] = [
        ['Order ID', 'Customer Name', 'Customer Email', 'Customer Phone', 'Address', 'Total', 'Date Created', 'Status', 'Items List']
      ];
      
      snap.forEach((docSnap) => {
        const o = docSnap.data();
        const itemsList = o.items && Array.isArray(o.items)
          ? o.items.map((i: any) => `${i.name} (Color: ${i.color || 'N/A'}, Size: ${i.size || 'N/A'}, Qty: ${i.quantity || 1})`).join('; ')
          : 'None';

        const addressParts = [];
        if (o.shippingInfo?.address) addressParts.push(o.shippingInfo.address);
        if (o.shippingInfo?.city) addressParts.push(o.shippingInfo.city);
        if (o.shippingInfo?.wilaya) addressParts.push(o.shippingInfo.wilaya);
        const finalAddress = addressParts.length > 0 
          ? addressParts.join(', ') 
          : (o.shippingAddress?.address || 'N/A');

        let formattedDate = 'N/A';
        if (o.createdAt) {
          if (typeof o.createdAt.toDate === 'function') {
            formattedDate = o.createdAt.toDate().toISOString();
          } else if (o.createdAt.seconds) {
            formattedDate = new Date(o.createdAt.seconds * 1000).toISOString();
          } else {
            formattedDate = String(o.createdAt);
          }
        } else if (o.timestamp) {
          if (typeof o.timestamp.toDate === 'function') {
            formattedDate = o.timestamp.toDate().toISOString();
          } else {
            formattedDate = String(o.timestamp);
          }
        }

        rows.push([
          docSnap.id,
          o.shippingInfo?.name || o.shippingAddress?.fullName || o.customerName || 'Clinician Member',
          o.shippingInfo?.email || o.shippingAddress?.email || o.customerEmail || 'N/A',
          o.shippingInfo?.phone || o.shippingAddress?.phone || o.customerPhone || 'N/A',
          finalAddress,
          o.total || '0 DA',
          formattedDate,
          o.status || 'pending',
          itemsList
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Joamedic_Orders_Backup_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMsg("Orders transaction log successfully exported as local CSV file!");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate local Orders CSV backup.");
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white bg-slate-950 min-h-[300px]">
        <Loader className="animate-spin text-teal-400 mb-2" size={32} />
        <p className="text-sm text-white/60">Fetching Google Sheets workspace setups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-display font-semibold tracking-tight text-white flex items-center gap-3">
          <FileSpreadsheet className="text-teal-400" size={32} /> Google Sheets Integration
        </h1>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Surgical and clinical management. Directly export, log, and synchronize products catalog and medical client transactions directly onto official Google Sheets.
        </p>
      </div>

      {/* Notifications banner */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/15 border border-red-500/20 text-red-300 rounded-2xl flex flex-col gap-3.5 text-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-red-200">Synchronization Alert</p>
                <p className="text-white/70 text-xs mt-1 leading-relaxed">{error}</p>
              </div>
            </div>

            {/* Direct fallback CSV downloads if connection is flaky/blocked */}
            <div className="flex flex-wrap gap-2.5 sm:pl-7">
              <button 
                type="button"
                onClick={downloadProductsCSV}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-lg text-xs text-teal-300 hover:text-white transition-all flex items-center gap-1.5 font-medium shrink-0"
              >
                <FileDown size={12} /> Download Products Backup (CSV)
              </button>
              <button 
                type="button"
                onClick={downloadOrdersCSV}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-lg text-xs text-teal-300 hover:text-white transition-all flex items-center gap-1.5 font-medium shrink-0"
              >
                <FileDown size={12} /> Download Orders Backup (CSV)
              </button>
            </div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 rounded-2xl flex items-start gap-3 text-sm"
          >
            <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-white/70 text-xs mt-0.5">{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: OAuth Linkage */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Power size={18} className="text-teal-400" /> API State Control
            </h3>

            {accessToken ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">Authorized & Connected</p>
                    <p className="text-[10px] text-white/40 mt-0.5 font-mono">Token: active in-memory</p>
                  </div>
                </div>

                <div className="text-white/60 text-xs py-1">
                  You are fully authenticated and can push active clinical apparel data straight to Drive.
                </div>

                <button
                  onClick={disconnectSheets}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 hover:text-red-200 rounded-xl text-xs font-semibold transition-all uppercase tracking-wider"
                >
                  Disconnect Token
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30 shrink-0"></div>
                  <div>
                    <p className="text-xs font-semibold text-white/50">Token Unavailable</p>
                    <p className="text-[10px] text-white/40 mt-0.5 font-mono">Status: offline</p>
                  </div>
                </div>

                <p className="text-xs text-white/50 leading-relaxed">
                  Connection with the Google Sheets API is secure. Authorize the application to read and write spreadsheets in your workspace.
                </p>

                <button
                  onClick={connectGoogleSheets}
                  disabled={connecting}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl text-xs transition-all uppercase tracking-wider disabled:opacity-50"
                >
                  {connecting ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  Connect Google Sheets
                </button>
              </div>
            )}
          </div>

          {/* Apps Script Webhook Alternative */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-xs space-y-4 shadow-lg backdrop-blur-xl">
            <h4 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Database size={16} className="text-teal-400" /> Webhook Integration
            </h4>
            <p className="text-white/60 leading-relaxed text-[11px]">
              If browser ad-blockers block direct Google Sheets API communication, you can bypass OAuth by entering a normal Google Apps Script Web App Webhook URL instead.
            </p>
            
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webAppUrlInput}
              onChange={(e) => setWebAppUrlInput(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-teal-400/50 text-white font-mono text-[11px] placeholder:text-white/20 transition-all hover:border-white/20"
            />
            
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => setShowScriptInfo(!showScriptInfo)}
                className="text-teal-400 hover:text-teal-300 text-[10px] uppercase tracking-wider font-bold transition-colors"
              >
                {showScriptInfo ? "Hide Script Details" : "Show App Script Setup"}
              </button>
              
              <button
                onClick={handleSaveWebhook}
                className="px-4 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold transition-all shadow-md"
              >
                Save URL
              </button>
            </div>
            
            <AnimatePresence>
              {showScriptInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 border border-white/10 rounded-xl p-3 pb-4 text-[10px] text-teal-100/70 font-mono overflow-auto max-h-60 mt-2 whitespace-pre"
                >
{`/* 
1. Open Google Sheets > Extensions > Apps Script
2. Paste this code
3. Click "Deploy" > "New deployment"
4. Types: Web App
5. Execute as: Me
6. Who has access: Anyone
7. Copy the Web App URL and paste it above 
*/

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;
  var rows = payload.data;
  
  if (action === 'sync_orders') {
    var ms = sheet.getSheetByName("Orders") || sheet.insertSheet("Orders");
    ms.clear();
    if(rows.length > 0) {
      ms.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
  } else if (action === 'add_order') {
    var ms = sheet.getSheetByName("Orders") || sheet.insertSheet("Orders");
    if (ms.getLastRow() === 0) {
      // Create headers if empty
      ms.appendRow([
        'Order ID',
        'Customer Name',
        'Customer Email',
        'Deliverable Phone',
        'Clinie / Station Address',
        'Order Total Amount',
        'Transaction Timestamp',
        'Fulfillment Status',
        'Purchased items detail'
      ]);
    }
    if (rows && rows.length > 0) {
      ms.appendRow(rows[0]);
    }
  } else if (action === 'sync_products') {
    var ps = sheet.getSheetByName("Products") || sheet.insertSheet("Products");
    ps.clear();
    if(rows.length > 0) {
      ps.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({success: true}))
                       .setMimeType(ContentService.MimeType.JSON);
}`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: Spreadsheet integration & Sync buttons */}
        <div className="lg:col-span-2 space-y-6">

          {/* Sheet Registry */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Database size={18} className="text-teal-400" /> Active Spreadsheet Target
            </h3>

            {config.spreadsheetId ? (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate max-w-[280px]">
                        {config.spreadsheetTitle || 'Active Store Database'}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs transition-colors shrink-0"
                    >
                      <ExternalLink size={12} /> Open Sheet
                    </a>
                    
                    <button
                      onClick={unlinkSpreadsheet}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-xs transition-colors shrink-0 font-medium"
                    >
                      Unlink Target
                    </button>
                  </div>
                </div>

                {config.lastSyncedAt && (
                  <p className="text-[11px] text-teal-400/80 font-mono">
                    Last synchronizations completed at: {config.lastSyncedAt}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl text-xs text-yellow-300/80 leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="shrink-0 mt-0.5" size={16} />
                  No spreadsheet is currently mapped to this clinician portal. Please choose the "joamedic" spreadsheet option to automatically discover or deploy it:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Create New / Discover joamedic */}
                  <div className="border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-white text-xs uppercase tracking-wider text-teal-400">Discover "joamedic" Sheet</p>
                      <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                        Instantly look for an existing spreadsheet named "joamedic" in your Drive. If none exists, we will automatically set up and format a brand new one.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewSpreadsheet}
                      disabled={!accessToken || creatingSheet}
                      className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-black text-xs font-semibold rounded-xl uppercase tracking-wider transition-all disabled:opacity-40"
                    >
                      {creatingSheet ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Use Spreadsheet "joamedic"
                    </button>
                  </div>

                  {/* Manual ID link */}
                  <div className="border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-white text-xs uppercase tracking-wider text-teal-400">Manual Mapping</p>
                      <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                        Manually map an existing Google Spreadsheet ID or full URL from your clipboard to this admin console.
                      </p>
                    </div>
                    
                    <form onSubmit={handleLinkManualSpreadsheet} className="mt-4 flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Link or Spreadsheet ID"
                        value={manualSheetId}
                        onChange={(e) => setManualSheetId(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-white flex-1 min-w-0"
                      />
                      <button
                        type="submit"
                        disabled={!manualSheetId.trim()}
                        className="px-3 py-2 bg-teal-500/20 hover:bg-teal-500 border border-teal-500/20 hover:text-black text-teal-300 rounded-lg text-xs transition-all shrink-0 font-bold"
                      >
                        Link
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sync operations list */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-teal-400" /> Google Sheets Bi-directional Sync Hub
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Sync Products Catalog</h4>
                    <p className="text-[11px] text-white/40">Rewriting stock, colors, titles, and price data onto the sheet</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncProducts}
                  disabled={!accessToken || !config.spreadsheetId || syncingProducts}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  {syncingProducts ? <Loader size={12} className="animate-spin" /> : <FileDown size={12} />}
                  Export Products
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Sync Orders to Sheet</h4>
                    <p className="text-[11px] text-white/40">Push Firestore orders to Spreadsheet for client tracking and shipping</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncOrders}
                  disabled={!accessToken || !config.spreadsheetId || syncingOrders}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  {syncingOrders ? <Loader size={12} className="animate-spin" /> : <FileDown size={12} />}
                  Export Orders
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                    <FileUp size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Control & Pull Orders from Sheet</h4>
                    <p className="text-[11px] text-white/40">Import edits from Google Sheet (statuses, addresses, names) back into Firestore</p>
                  </div>
                </div>
                <button
                  onClick={handlePullOrders}
                  disabled={!accessToken || !config.spreadsheetId || pullingOrders}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-300 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  {pullingOrders ? <Loader size={12} className="animate-spin" /> : <FileUp size={12} />}
                  Pull Orders
                </button>
              </div>

              {/* Offline / Ad-blocker CSV Fallback Card */}
              <div className="p-4 bg-teal-500/5 border border-teal-500/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
                <div>
                  <h4 className="text-xs font-semibold text-teal-400 flex items-center gap-1.5 uppercase tracking-wider mb-1">
                    <FileDown size={14} /> Offline / Ad-Blocker CSV Fallback
                  </h4>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    If Google Sheets servers are restricted by your browser ad-blockers, Brave Shields, or connection errors, download immediate backups as raw CSV spreadsheet files.
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                  <button 
                    type="button"
                    onClick={downloadProductsCSV}
                    className="w-full sm:w-auto px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-teal-300 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 uppercase tracking-wider font-bold"
                  >
                    CSV Products
                  </button>
                  <button 
                    type="button"
                    onClick={downloadOrdersCSV}
                    className="w-full sm:w-auto px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white hover:text-teal-300 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 uppercase tracking-wider font-bold"
                  >
                    CSV Orders
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={handleSyncAll}
                  disabled={!accessToken || !config.spreadsheetId || syncingProducts || syncingOrders || pullingOrders}
                  className="flex items-center gap-2 px-5 py-3 bg-teal-500 text-black rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-teal-400 transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)] disabled:opacity-40 disabled:pointer-events-none"
                >
                  {(syncingProducts || syncingOrders || pullingOrders) ? (
                    <Loader size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Full Core Database Sync
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
