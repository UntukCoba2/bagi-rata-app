import React, { useState, useEffect, useRef } from 'react';
import { Camera, User, Plus, ArrowRight, ArrowLeft, CheckCircle2, Edit2, UserPlus, X, Minus, Share2, Users, Settings, Save, Trash2, Receipt, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {}
  };
  return [storedValue, setValue];
}

export default function App() {
  const [step, setStep] = useLocalStorage('br_step', 1);
  const [items, setItems] = useLocalStorage('br_items', []);
  const [friends, setFriends] = useLocalStorage('br_friends', []);
  const [isUnitPriceMode, setIsUnitPriceMode] = useLocalStorage('br_priceMode', false);
  const [tax, setTax] = useLocalStorage('br_tax', 0);
  const [serviceCharge, setServiceCharge] = useLocalStorage('br_service', 0);
  const [discount, setDiscount] = useLocalStorage('br_discount', 0);
  const [roundingMode, setRoundingMode] = useLocalStorage('br_rounding', 1);
  
  const [newFriendName, setNewFriendName] = useState("");
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [editFriendName, setEditFriendName] = useState("");

  const [activeItemForAssignment, setActiveItemForAssignment] = useState(null);
  const [tempSelections, setTempSelections] = useState({});
  const [modalSplitMode, setModalSplitMode] = useState('portion');

  const [showSettings, setShowSettings] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({ bank: '', account: '', name: '' });
  const [tempPaymentInfo, setTempPaymentInfo] = useState({ bank: '', account: '', name: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [dialog, setDialog] = useState(null); 
  const receiptRef = useRef(null);

  const triggerVibration = (pattern = 10) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (error) {} 
  };

  useEffect(() => {
    const savedInfo = localStorage.getItem('bagiRataPaymentInfo');
    if (savedInfo) setPaymentInfo(JSON.parse(savedInfo));
  }, []);

  const handleSavePaymentInfo = () => {
    triggerVibration(20);
    setPaymentInfo(tempPaymentInfo);
    localStorage.setItem('bagiRataPaymentInfo', JSON.stringify(tempPaymentInfo));
    setShowSettings(false);
  };

  const handleResetApp = () => {
    triggerVibration([30, 50, 30]);
    setDialog({
      type: 'confirm',
      title: 'Reset Tagihan?',
      message: 'Yakin ingin menghapus semua data dan membuat tagihan baru?',
      isDestructive: true,
      onConfirm: () => {
        setStep(1);
        setItems([]);
        setFriends([]);
        setTax(0);
        setServiceCharge(0);
        setDiscount(0);
        setRoundingMode(1);
        setShowSettings(false);
        setDialog(null);
      }
    });
  };

  const handleSimulateScan = () => {
    triggerVibration(20);
    setIsUnitPriceMode(false);
    setItems([
      { id: 'item1', name: 'Nasi Goreng', price: 105000, qty: 3, assignedTo: {}, isSplitEqually: false }, 
      { id: 'item2', name: 'Es Kopi Susu', price: 20000, qty: 1, assignedTo: {}, isSplitEqually: false },
      { id: 'item3', name: 'Snack Platter Besar', price: 75000, qty: 1, assignedTo: {}, isSplitEqually: false },
    ]);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    triggerVibration(20);
    const validItems = items.filter(item => (item.name || "").trim() !== "");
    
    if (validItems.length === 0) {
      triggerVibration([30, 50, 30]);
      setDialog({ type: 'alert', title: 'Menu Masih Kosong ⚠️', message: 'Harap masukkan setidaknya satu nama menu sebelum melanjutkan!' });
      return;
    }
    
    const hasEmptyPrice = validItems.some(item => !item.price || item.price <= 0);
    if (hasEmptyPrice) {
      triggerVibration([30, 50, 30]);
      setDialog({ type: 'alert', title: 'Harga Tidak Valid ⚠️', message: 'Terdapat menu yang harganya masih kosong atau 0. Harap isi harga untuk semua menu.' });
      return;
    }

    setItems(validItems);
    setStep(3);
  };

  const handleAddFriend = (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    triggerVibration(15);
    setFriends([...friends, { id: `f${Date.now()}`, name: newFriendName.trim() }]);
    setNewFriendName("");
  };

  const startEditFriend = (friend) => {
    triggerVibration(10);
    setEditingFriendId(friend.id);
    setEditFriendName(friend.name);
  };

  const saveEditFriend = (id) => {
    if(!editFriendName.trim()) {
      setEditingFriendId(null);
      return;
    }
    triggerVibration(10);
    setFriends(friends.map(f => f.id === id ? { ...f, name: editFriendName.trim() } : f));
    setEditingFriendId(null);
  };

  const deleteFriend = (id) => {
    triggerVibration([15, 30]);
    setFriends(friends.filter(f => f.id !== id));
    setItems(items.map(item => {
      if (item.assignedTo && item.assignedTo[id]) {
        const newAssigned = { ...item.assignedTo };
        delete newAssigned[id];
        return { ...item, assignedTo: newAssigned };
      }
      return item;
    }));
  };

  const openModal = (item) => {
    if (!item) return; 
    triggerVibration(15);
    setActiveItemForAssignment(item.id);
    setTempSelections(item.assignedTo || {});
    setModalSplitMode(item.isSplitEqually ? 'equal' : 'portion');
  };

  const handleToggleModalMode = (mode) => {
    triggerVibration(10);
    setModalSplitMode(mode);
    setTempSelections({}); 
  };

  const currentItem = items.find(i => i.id === activeItemForAssignment);
  const totalSelectedQty = Object.values(tempSelections || {}).reduce((acc, val) => acc + (val || 0), 0);

  const incrementQty = (friendId) => {
    if (!currentItem) return; 
    triggerVibration(10);
    if (totalSelectedQty < (currentItem.qty || 1)) {
      setTempSelections(prev => ({ ...prev, [friendId]: (prev[friendId] || 0) + 1 }));
    }
  };

  const decrementQty = (friendId) => {
    if (tempSelections[friendId] > 0) {
      triggerVibration(10);
      setTempSelections(prev => {
        const updated = { ...prev, [friendId]: prev[friendId] - 1 };
        if (updated[friendId] === 0) delete updated[friendId];
        return updated;
      });
    }
  };

  const toggleShare = (friendId) => {
    triggerVibration(15);
    setTempSelections(prev => {
      const updated = { ...prev };
      if (updated[friendId]) delete updated[friendId]; else updated[friendId] = 1; 
      return updated;
    });
  };

  const handleSaveAssignment = () => {
    if (!currentItem) {
      setActiveItemForAssignment(null);
      return;
    }
    if (modalSplitMode === 'portion' && totalSelectedQty > 0 && totalSelectedQty !== currentItem.qty) {
      triggerVibration([30, 50, 30]);
      setDialog({ type: 'alert', title: 'Porsi Belum Pas! ⚠️', message: `Anda baru membagikan ${totalSelectedQty} dari ${currentItem.qty} porsi. Silakan lengkapi sisanya terlebih dahulu.` });
      return;
    }
    triggerVibration([15, 30, 15]);
    setItems(items.map(item => item.id === activeItemForAssignment ? { ...item, assignedTo: tempSelections || {}, isSplitEqually: modalSplitMode === 'equal' } : item));
    setActiveItemForAssignment(null);
  };

  const handleCalculate = () => {
    triggerVibration(20);
    const isAllAssigned = items.every(item => {
      const assignedTo = item.assignedTo || {}; 
      if (item.isSplitEqually) return Object.keys(assignedTo).length > 0;
      const assignedQty = Object.values(assignedTo).reduce((acc, val) => acc + val, 0);
      return assignedQty === (item.qty || 1);
    });

    if (!isAllAssigned) {
      triggerVibration([30, 50, 30]);
      setDialog({
        type: 'confirm',
        title: 'Menu Belum Habis ⚠️',
        message: 'Masih ada porsi menu yang belum dibagikan. Yakin ingin menghitung total sekarang?',
        isDestructive: false,
        onConfirm: () => { setStep(5); setDialog(null); }
      });
      return;
    }
    setStep(5);
  };

  const handlePriceInput = (e, index) => {
    const numericValue = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    const newItems = [...items];
    newItems[index].price = numericValue;
    setItems(newItems);
  };

  const getItemActualTotal = (item) => {
    if (!item) return 0;
    return isUnitPriceMode ? ((item.price || 0) * (item.qty || 1)) : (item.price || 0);
  };

  const getCalculatedTotals = () => {
    const totalSubtotal = items.reduce((sum, item) => sum + getItemActualTotal(item), 0);
    return friends.map(friend => {
      let friendSubtotal = 0;
      items.forEach(item => {
        const assignedTo = item.assignedTo || {};
        if (assignedTo[friend.id]) {
          if (item.isSplitEqually) {
            friendSubtotal += getItemActualTotal(item) / Math.max(1, Object.keys(assignedTo).length);
          } else {
            friendSubtotal += (isUnitPriceMode ? (item.price || 0) : ((item.price || 0) / Math.max(1, item.qty || 1))) * assignedTo[friend.id];
          }
        }
      });

      const proportion = totalSubtotal > 0 ? friendSubtotal / totalSubtotal : 0;
      const friendTax = proportion * tax;
      const friendService = proportion * serviceCharge;
      const friendDiscount = proportion * discount;
      
      const rawGrandTotal = friendSubtotal + friendTax + friendService - friendDiscount;
      const roundedGrandTotal = Math.round(rawGrandTotal / roundingMode) * roundingMode;
      
      return {
        ...friend,
        subtotal: friendSubtotal,
        taxAndService: friendTax + friendService,
        discount: friendDiscount,
        rawTotal: rawGrandTotal,
        grandTotal: roundedGrandTotal > 0 ? roundedGrandTotal : 0
      };
    });
  };

  const handleShareWA = () => {
    triggerVibration(20);
    const totals = getCalculatedTotals();
    const grandTotalCollected = totals.reduce((sum, f) => sum + f.grandTotal, 0);
    let text = "*RINGKASAN PATUNGAN* 📝\n\n";
    totals.forEach(f => {
      if (f.grandTotal > 0) text += `👤 *${f.name}*: Rp ${f.grandTotal.toLocaleString('id-ID')}\n`;
    });
    if (roundingMode !== 1) text += `\n*(Dibulatkan ke Rp ${roundingMode.toLocaleString('id-ID')} terdekat)*\n`;
    text += `\n💳 *Total Tagihan*: Rp ${grandTotalCollected.toLocaleString('id-ID')}\n`;
    if (paymentInfo.bank || paymentInfo.account) {
      text += `\n🏦 *Info Pembayaran*:\nBank/E-Wallet: ${paymentInfo.bank || '-'}\nNo. Rekening: ${paymentInfo.account || '-'}\nAtas Nama: ${paymentInfo.name || '-'}\n`;
    } else {
      text += "\nTransfer ke Rekening/QRIS: [Isi Disini]";
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    triggerVibration(15);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#f9fafb', useCORS: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image; link.download = `Tagihan-BagiRata-${new Date().getTime()}.png`; link.click();
      triggerVibration([15, 30, 15]); 
    } catch (error) {
      triggerVibration([30, 50, 30]);
      setDialog({ type: 'alert', title: 'Gagal Download ❌', message: 'Maaf, terjadi kesalahan saat membuat gambar struk. Coba lagi.' });
    } finally {
      setIsDownloading(false);
    }
  };

  const InputStyleBase = "p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-medium";
  const InputStyle = `w-full ${InputStyleBase}`; 
  
  const MainButton = ({ onClick, children, disabled, variant = 'primary' }) => {
    const base = "w-full font-bold py-4 px-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-blue-500/30",
      success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-emerald-500/30",
      outline: "bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 shadow-sm"
    };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>{children}</button>;
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };
  const pageTransition = { type: 'tween', ease: 'easeInOut', duration: 0.25 };

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* STRUK UNTUK DI DOWNLOAD */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={receiptRef} className="w-[450px] bg-gray-50 p-8 font-sans text-gray-800">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-center mb-6 border-b-2 border-dashed border-gray-200 pb-6">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">BAGIRATA</h1>
              <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="space-y-4 mb-6 border-b-2 border-dashed border-gray-200 pb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Rincian Patungan</h3>
              {getCalculatedTotals().map(friend => {
                if (friend.grandTotal <= 0 && friend.subtotal === 0) return null;
                return (
                  <div key={`receipt-${friend.id}`} className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{friend.name}</p>
                      <p className="text-xs text-gray-500">Makan: Rp {Math.round(friend.subtotal).toLocaleString('id-ID')}</p>
                    </div>
                    <p className="font-black text-blue-600 text-lg">Rp {friend.grandTotal.toLocaleString('id-ID')}</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 mb-6 border-b-2 border-dashed border-gray-200 pb-6">
              <div className="flex justify-between text-sm text-gray-500"><span>Pajak</span><span>Rp {tax.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-sm text-gray-500"><span>Service Charge</span><span>Rp {serviceCharge.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-sm text-emerald-600"><span>Diskon</span><span>- Rp {discount.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-xl font-black text-gray-900 pt-2 mt-2 border-t border-gray-100">
                <span>TOTAL KESELURUHAN</span>
                <span>Rp {getCalculatedTotals().reduce((sum, f) => sum + f.grandTotal, 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Info Pembayaran</h3>
              <p className="font-bold text-gray-900">{paymentInfo.bank || 'Bank / E-Wallet belum diset'}</p>
              <p className="font-mono text-lg text-blue-700 font-bold my-1">{paymentInfo.account || '-'}</p>
              <p className="text-sm text-gray-600">a.n {paymentInfo.name || '-'}</p>
            </div>
            <div className="text-center mt-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Dibuat otomatis oleh Aplikasi BagiRata</div>
          </div>
        </div>
      </div>

      {/* KONTENER UTAMA */}
      <div className="h-[100dvh] w-full overflow-hidden bg-gray-100 md:bg-gray-200 flex justify-center md:items-center font-sans text-gray-800 relative">
        <div className="w-full max-w-md bg-white md:rounded-[2.5rem] md:shadow-2xl overflow-hidden flex flex-col relative h-full md:h-[85vh] md:max-h-[850px]">
          
          <div className="h-1.5 w-full bg-gray-100 absolute top-0 z-20 shrink-0">
            <div className="h-full bg-blue-500 transition-all duration-500 rounded-r-full" style={{ width: `${(step / 5) * 100}%` }}></div>
          </div>

          <div className="flex justify-between items-center px-6 pt-6 pb-2 relative z-10 bg-white shrink-0">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button onClick={() => { triggerVibration(10); setStep(step - 1); }} className="p-2 -ml-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {step === 1 ? 'BagiRata' : step === 2 ? 'Cek Tagihan' : step === 3 ? 'Anggota' : step === 4 ? 'Pembagian' : 'Ringkasan'}
              </h2>
            </div>
            <button onClick={() => { triggerVibration(10); setTempPaymentInfo(paymentInfo); setShowSettings(true); }} className="p-2.5 bg-gray-50 border border-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
              <Settings size={20} />
            </button>
          </div>

          {/* AREA KONTEN DENGAN ANIMATE PRESENCE */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-2 hide-scroll relative flex flex-col">
            <AnimatePresence mode="wait">
              
              {step === 1 && (
                <motion.div key="step1" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="flex flex-col items-center justify-between h-full pt-10 pb-2">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-32 h-32 mb-4 bg-white border-2 border-gray-100 rounded-3xl p-3 shadow-sm flex items-center justify-center relative">
                      <img src="/pwa-192x192.png" alt="BagiRata Logo" className="w-full h-full object-contain rounded-2xl" />
                    </div>
                    <div className="text-center">
                      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">BagiRata</h1>
                      <p className="text-gray-500 text-sm">Hitung patungan tanpa pusing.</p>
                    </div>
                    <div className="w-full space-y-4 mt-8">
                      <MainButton onClick={handleSimulateScan}><Camera size={22} /> Scan Struk Bill</MainButton>
                      <div className="flex items-center w-full py-2">
                        <hr className="flex-1 border-gray-200" /><span className="px-3 text-gray-400 text-xs font-bold uppercase tracking-wider">Atau</span><hr className="flex-1 border-gray-200" />
                      </div>
                      <MainButton onClick={() => { triggerVibration(15); setItems([{ id: 'm1', name: '', price: 0, qty: 1, assignedTo: {}, isSplitEqually: false }]); setStep(2); }} variant="outline">
                        <Edit2 size={20} className="text-gray-500" /> Input Manual
                      </MainButton>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-400 text-center mt-auto font-medium tracking-wide pb-2">
                    Copyright © 2026 BagiRata<br/>Designed by Stubadibap All rights reserved
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-4">
                  <p className="text-sm text-gray-500 mb-2">Biarkan nama menu kosong untuk menghapus</p>
                  <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-inner">
                    <button onClick={() => { triggerVibration(10); setIsUnitPriceMode(false); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isUnitPriceMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Total Harga</button>
                    <button onClick={() => { triggerVibration(10); setIsUnitPriceMode(true); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isUnitPriceMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Harga Satuan</button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="flex gap-2">
                        <input type="number" min="1" value={item.qty} onChange={(e) => { const newItems = [...items]; newItems[index].qty = parseInt(e.target.value) || 1; setItems(newItems); }} className={`${InputStyleBase} w-16 shrink-0 text-center text-blue-600`} placeholder="Qty" />
                        <input type="text" value={item.name} onChange={(e) => { const newItems = [...items]; newItems[index].name = e.target.value; setItems(newItems); }} className={`${InputStyleBase} flex-1 min-w-0`} placeholder="Nama Menu" />
                        <input type="text" inputMode="numeric" value={item.price ? item.price.toLocaleString('id-ID') : ''} onChange={(e) => handlePriceInput(e, index)} className={`${InputStyleBase} w-32 shrink-0 text-right`} placeholder={isUnitPriceMode ? "Satuan" : "Total"} />
                      </div>
                    ))}
                    <button onClick={() => { triggerVibration(10); setItems([...items, { id: `m${Date.now()}`, name: '', price: 0, qty: 1, assignedTo: {}, isSplitEqually: false }]); }} className="text-blue-600 font-bold text-sm flex items-center gap-1 mt-4 px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors">
                      <Plus size={18} /> Tambah Menu Lain
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-4">
                  <p className="text-sm text-gray-500">Siapa saja yang ikut patungan hari ini?</p>
                  <form onSubmit={handleAddFriend} className="flex gap-2">
                    <input type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Ketik nama teman..." className={`${InputStyleBase} flex-1 min-w-0`} />
                    <button type="submit" className="bg-blue-100 text-blue-600 px-4 rounded-xl hover:bg-blue-200 transition-colors active:scale-95"><Plus size={24} /></button>
                  </form>
                  <div className="space-y-2 mt-6">
                    {friends.length === 0 && <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl">Belum ada anggota</div>}
                    {friends.map((friend) => (
                      <div key={friend.id} className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-3 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2.5 rounded-full text-blue-600 shrink-0"><User size={18} /></div>
                        
                        {editingFriendId === friend.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input 
                              type="text" 
                              value={editFriendName} 
                              onChange={(e) => setEditFriendName(e.target.value)} 
                              className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 focus:outline-none focus:border-blue-500 font-bold text-gray-700 text-sm" 
                              autoFocus 
                            />
                            <button onClick={() => saveEditFriend(friend.id)} className="text-green-500 p-1.5 hover:bg-green-50 rounded-lg"><CheckCircle2 size={18} /></button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-gray-700 flex-1 truncate">{friend.name}</span>
                            <button onClick={() => startEditFriend(friend)} className="text-gray-400 hover:text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            <button onClick={() => deleteFriend(friend.id)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">Klik pada menu untuk memilih siapa yang pesan.</p>
                  {items.map((item) => {
                    const assignedTo = item.assignedTo || {};
                    const assignedCount = Object.keys(assignedTo).length;
                    const assignedQty = Object.values(assignedTo).reduce((acc, val) => acc + val, 0);
                    const isFulfilled = item.isSplitEqually ? assignedCount > 0 : assignedQty === (item.qty || 1);
                    const displayPrice = getItemActualTotal(item);

                    return (
                      <button key={item.id} onClick={() => openModal(item)} className={`w-full text-left p-4 bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md active:scale-[0.99] ${isFulfilled ? 'border-green-200 bg-green-50/20' : 'border-gray-100 hover:border-blue-200'} flex justify-between items-center`}>
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-black">{item.qty || 1}x</span>
                            <h3 className="font-bold text-gray-900">{item.name}</h3>
                          </div>
                          <p className="text-sm font-medium text-gray-500">Rp {displayPrice.toLocaleString('id-ID')}</p>
                          {item.isSplitEqually && assignedCount > 0 && <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-md tracking-wide uppercase">Dibagi {assignedCount} Orang</span>}
                        </div>
                        <div className={`shrink-0 h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                            isFulfilled ? 'bg-green-100 text-green-700' : (assignedQty > 0 || assignedCount > 0) ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}>
                          {isFulfilled ? <CheckCircle2 size={20} /> : item.isSplitEqually ? <Users size={18} /> : assignedQty > 0 ? `${assignedQty}/${item.qty || 1}` : <Plus size={20} />}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="space-y-6">
                  <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                    <div>
                      <label className="text-[11px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wide">Pajak</label>
                      <input type="text" inputMode="numeric" value={tax ? tax.toLocaleString('id-ID') : ''} onChange={(e) => setTax(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} className={`${InputStyle} p-2.5 text-sm`} placeholder="Rp 0" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wide">Service</label>
                      <input type="text" inputMode="numeric" value={serviceCharge ? serviceCharge.toLocaleString('id-ID') : ''} onChange={(e) => setServiceCharge(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} className={`${InputStyle} p-2.5 text-sm`} placeholder="Rp 0" />
                    </div>
                    <div>
                      <label className="text-[11px] text-emerald-600 font-bold mb-1.5 block uppercase tracking-wide">Diskon</label>
                      <input type="text" inputMode="numeric" value={discount ? discount.toLocaleString('id-ID') : ''} onChange={(e) => setDiscount(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} className={`${InputStyle} p-2.5 text-sm border-emerald-200 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-100 text-emerald-700`} placeholder="Rp 0" />
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600 pl-3">Pembulatan:</span>
                    <div className="flex bg-gray-50 p-1 rounded-xl">
                      <button onClick={() => { triggerVibration(10); setRoundingMode(1); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 1 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Tepat</button>
                      <button onClick={() => { triggerVibration(10); setRoundingMode(500); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 500 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>500</button>
                      <button onClick={() => { triggerVibration(10); setRoundingMode(1000); }} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 1000 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>1Rb</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getCalculatedTotals().map(friend => {
                      if (friend.grandTotal <= 0 && friend.subtotal === 0) return null;
                      return (
                        <div key={friend.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-gray-200">
                            <span className="font-extrabold text-gray-900 text-lg">{friend.name}</span>
                            <span className="font-extrabold text-blue-600 text-xl">Rp {friend.grandTotal.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="text-xs font-medium text-gray-500 space-y-1.5">
                            <div className="flex justify-between"><span>Makan:</span><span className="text-gray-700">Rp {Math.round(friend.subtotal).toLocaleString('id-ID')}</span></div>
                            {friend.taxAndService > 0 && <div className="flex justify-between text-orange-600"><span>Pjk & Svc (+):</span><span>Rp {Math.round(friend.taxAndService).toLocaleString('id-ID')}</span></div>}
                            {friend.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon (-):</span><span>-Rp {Math.round(friend.discount).toLocaleString('id-ID')}</span></div>}
                            {roundingMode !== 1 && friend.grandTotal !== Math.round(friend.rawTotal) && <div className="flex justify-between text-gray-400 italic pt-2 mt-2 border-t border-gray-50"><span>Sblm dibulatkan:</span><span>Rp {Math.round(friend.rawTotal).toLocaleString('id-ID')}</span></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER ACTION */}
          {step > 1 && (
            <div className="bg-white p-6 pt-4 border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10 shrink-0">
              {step === 2 && <MainButton onClick={handleNextFromStep2}>Lanjut ke Anggota <ArrowRight size={20} /></MainButton>}
              {step === 3 && <MainButton onClick={() => { triggerVibration(15); setStep(4); }} disabled={friends.length < 1}>Mulai Bagi Tagihan <ArrowRight size={20} /></MainButton>}
              {step === 4 && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button onClick={() => { triggerVibration(10); setStep(2); }} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"><Edit2 size={16} /> Edit Menu</button>
                    <button onClick={() => { triggerVibration(10); setStep(3); }} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"><UserPlus size={16} /> Edit Teman</button>
                  </div>
                  <MainButton onClick={handleCalculate} variant="success"><CheckCircle2 size={20} /> Selesai & Hitung Total</MainButton>
                </div>
              )}
              {step === 5 && (
                <div className="space-y-3">
                  <MainButton onClick={handleShareWA} variant="success"><Share2 size={20} /> Bagikan ke WhatsApp</MainButton>
                  <button onClick={handleDownloadReceipt} disabled={isDownloading} className="w-full bg-white text-blue-600 border-2 border-blue-100 font-bold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50">
                    {isDownloading ? <span className="animate-pulse">Membuat Gambar...</span> : <><Download size={20} /> Download Gambar Struk</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ANIMASI MODAL BOTTOM SHEET (PEMBAGIAN) */}
          <AnimatePresence>
            {activeItemForAssignment && currentItem && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
                  onClick={() => { triggerVibration(10); handleSaveAssignment(); }}
                />
                <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 pb-8 relative z-10"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-extrabold text-2xl text-gray-900 leading-tight">{currentItem.name}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">{modalSplitMode === 'portion' ? `${currentItem.qty || 1} Porsi Tersedia` : `Total Rp ${getItemActualTotal(currentItem).toLocaleString('id-ID')}`}</p>
                    </div>
                    <button onClick={() => { triggerVibration(10); handleSaveAssignment(); }} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button>
                  </div>
                  
                  <div className="flex bg-gray-100 p-1.5 rounded-xl mb-5 shadow-inner">
                    <button onClick={() => handleToggleModalMode('portion')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modalSplitMode === 'portion' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Bagi per Porsi</button>
                    <button onClick={() => handleToggleModalMode('equal')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modalSplitMode === 'equal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Bagi Rata</button>
                  </div>

                  {modalSplitMode === 'portion' && (
                    <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-3 rounded-xl text-center font-bold mb-4 flex justify-between items-center text-sm">
                      <span>Porsi terbagikan:</span>
                      <span className={`text-lg font-black ${totalSelectedQty === (currentItem.qty || 1) ? 'text-green-600' : 'text-blue-600'}`}>{totalSelectedQty} / {currentItem.qty || 1}</span>
                    </div>
                  )}
                  
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto mb-6 hide-scroll">
                    {friends.map(friend => {
                      const isSelected = !!tempSelections[friend.id];
                      const qty = tempSelections[friend.id] || 0;
                      return (
                        <div key={friend.id} className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-colors ${(modalSplitMode === 'equal' ? isSelected : qty > 0) ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${(modalSplitMode === 'equal' ? isSelected : qty > 0) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}><User size={18} /></div>
                            <span className={`font-bold ${(modalSplitMode === 'equal' ? isSelected : qty > 0) ? 'text-blue-900' : 'text-gray-700'}`}>{friend.name}</span>
                          </div>
                          
                          {modalSplitMode === 'portion' && (
                            <div className="flex items-center gap-3">
                              <button onClick={() => decrementQty(friend.id)} className={`p-1.5 rounded-full transition-all active:scale-90 ${qty > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}><Minus size={16} /></button>
                              <span className="font-black text-lg w-5 text-center text-gray-900">{qty}</span>
                              <button onClick={() => incrementQty(friend.id)} disabled={totalSelectedQty >= (currentItem.qty || 1)} className={`p-1.5 rounded-full transition-all active:scale-90 ${totalSelectedQty < (currentItem.qty || 1) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}><Plus size={16} /></button>
                            </div>
                          )}
                          
                          {modalSplitMode === 'equal' && (
                            <button onClick={() => toggleShare(friend.id)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white scale-110' : 'bg-white border-gray-300'}`}>
                              {isSelected && <CheckCircle2 size={16} />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  <MainButton 
                    onClick={handleSaveAssignment} 
                    variant={(modalSplitMode === 'portion' && totalSelectedQty === (currentItem.qty || 1)) || (modalSplitMode === 'equal' && Object.keys(tempSelections || {}).length > 0) ? 'success' : 'primary'}
                    disabled={Object.keys(tempSelections || {}).length === 0 && modalSplitMode === 'equal'}
                  >
                    Simpan & Tutup
                  </MainButton>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ANIMASI MODAL SETTINGS */}
          <AnimatePresence>
            {showSettings && (
              <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
                  onClick={() => setShowSettings(false)}
                />
                <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 pb-8 relative z-10"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-extrabold text-xl text-gray-900">Pengaturan</h3>
                      <p className="text-xs font-medium text-gray-500 mt-1">Info pencairan dana otomatis tersimpan</p>
                    </div>
                    <button onClick={() => { triggerVibration(10); setShowSettings(false); }} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><X size={20} /></button>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-wide">Bank / E-Wallet</label>
                      <input type="text" value={tempPaymentInfo.bank} onChange={(e) => setTempPaymentInfo({...tempPaymentInfo, bank: e.target.value})} placeholder="Contoh: BCA, GoPay, OVO" className={InputStyle}/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-wide">Nomor Rekening</label>
                      <input type="text" inputMode="numeric" value={tempPaymentInfo.account} onChange={(e) => setTempPaymentInfo({...tempPaymentInfo, account: e.target.value.replace(/\D/g, '')})} placeholder="Contoh: 1234567890" className={InputStyle}/>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 block uppercase tracking-wide">Atas Nama</label>
                      <input type="text" value={tempPaymentInfo.name} onChange={(e) => setTempPaymentInfo({...tempPaymentInfo, name: e.target.value})} placeholder="Nama pemilik rekening" className={InputStyle}/>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <MainButton onClick={handleSavePaymentInfo}><Save size={20} /> Simpan Pengaturan</MainButton>
                    <button onClick={handleResetApp} className="w-full bg-red-50 text-red-600 font-bold py-4 px-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-red-100 transition-colors active:scale-95">
                      <Trash2 size={20} /> Reset Buat Tagihan Baru
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ANIMASI CUSTOM DIALOG */}
          <AnimatePresence>
            {dialog && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
                  onClick={() => dialog.type === 'alert' && setDialog(null)}
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative z-10 shadow-2xl text-center"
                >
                  <h3 className="text-xl font-extrabold text-gray-900 mb-2">{dialog.title}</h3>
                  <p className="text-sm font-medium text-gray-500 mb-8 px-2 leading-relaxed">{dialog.message}</p>
                  
                  {dialog.type === 'alert' ? (
                    <button onClick={() => { triggerVibration(10); setDialog(null); }} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors active:scale-95">
                      Mengerti
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => { triggerVibration(10); setDialog(null); }} className="flex-1 bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-200 transition-colors active:scale-95">
                        Batal
                      </button>
                      <button onClick={() => { triggerVibration(15); dialog.onConfirm(); }} className={`flex-1 font-bold py-3.5 rounded-2xl text-white shadow-lg transition-colors active:scale-95 ${dialog.isDestructive ? 'bg-red-600 shadow-red-500/30 hover:bg-red-700' : 'bg-blue-600 shadow-blue-500/30 hover:bg-blue-700'}`}>
                        {dialog.isDestructive ? 'Hapus' : 'Yakin'}
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}