import React, { useState, useEffect } from 'react';
import { Camera, User, Plus, ArrowRight, ArrowLeft, CheckCircle2, Edit2, UserPlus, X, Minus, Share2, Users, Settings, Save, Trash2, Receipt } from 'lucide-react';

// --- CUSTOM HOOK UNTUK AUTO-SAVE ---
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
  const [activeItemForAssignment, setActiveItemForAssignment] = useState(null);
  const [tempSelections, setTempSelections] = useState({});
  const [modalSplitMode, setModalSplitMode] = useState('portion');

  const [showSettings, setShowSettings] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({ bank: '', account: '', name: '' });
  const [tempPaymentInfo, setTempPaymentInfo] = useState({ bank: '', account: '', name: '' });

  useEffect(() => {
    const savedInfo = localStorage.getItem('bagiRataPaymentInfo');
    if (savedInfo) setPaymentInfo(JSON.parse(savedInfo));
  }, []);

  const handleSavePaymentInfo = () => {
    setPaymentInfo(tempPaymentInfo);
    localStorage.setItem('bagiRataPaymentInfo', JSON.stringify(tempPaymentInfo));
    setShowSettings(false);
  };

  const handleResetApp = () => {
    if(window.confirm("Yakin ingin menghapus semua data dan membuat tagihan baru?")) {
      setStep(1);
      setItems([]);
      setFriends([]);
      setTax(0);
      setServiceCharge(0);
      setDiscount(0);
      setRoundingMode(1);
      setShowSettings(false);
    }
  };

  const handleSimulateScan = () => {
    setIsUnitPriceMode(false);
    setItems([
      { id: 'item1', name: 'Nasi Goreng', price: 105000, qty: 3, assignedTo: {}, isSplitEqually: false }, 
      { id: 'item2', name: 'Es Kopi Susu', price: 20000, qty: 1, assignedTo: {}, isSplitEqually: false },
      { id: 'item3', name: 'Snack Platter Besar', price: 75000, qty: 1, assignedTo: {}, isSplitEqually: false },
    ]);
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    const validItems = items.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) {
      alert("⚠️ Harap masukkan setidaknya satu nama menu sebelum lanjut!");
      return;
    }
    setItems(validItems);
    setStep(3);
  };

  const handleAddFriend = (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    setFriends([...friends, { id: `f${Date.now()}`, name: newFriendName.trim() }]);
    setNewFriendName("");
  };

  const openModal = (item) => {
    setActiveItemForAssignment(item.id);
    setTempSelections(item.assignedTo || {});
    setModalSplitMode(item.isSplitEqually ? 'equal' : 'portion');
  };

  const handleToggleModalMode = (mode) => {
    setModalSplitMode(mode);
    setTempSelections({}); 
  };

  const currentItem = items.find(i => i.id === activeItemForAssignment);
  const totalSelectedQty = Object.values(tempSelections).reduce((acc, val) => acc + val, 0);

  const incrementQty = (friendId) => {
    if (totalSelectedQty < currentItem.qty) setTempSelections(prev => ({ ...prev, [friendId]: (prev[friendId] || 0) + 1 }));
  };

  const decrementQty = (friendId) => {
    if (tempSelections[friendId] > 0) {
      setTempSelections(prev => {
        const updated = { ...prev, [friendId]: prev[friendId] - 1 };
        if (updated[friendId] === 0) delete updated[friendId];
        return updated;
      });
    }
  };

  const toggleShare = (friendId) => {
    setTempSelections(prev => {
      const updated = { ...prev };
      if (updated[friendId]) delete updated[friendId]; else updated[friendId] = 1; 
      return updated;
    });
  };

  const handleSaveAssignment = () => {
    if (modalSplitMode === 'portion' && totalSelectedQty > 0 && totalSelectedQty !== currentItem.qty) {
      alert(`⚠️ Porsi belum pas!\n\nAnda membagikan ${totalSelectedQty} dari ${currentItem.qty} porsi.`);
      return;
    }
    setItems(items.map(item => item.id === activeItemForAssignment ? { ...item, assignedTo: tempSelections, isSplitEqually: modalSplitMode === 'equal' } : item));
    setActiveItemForAssignment(null);
  };

  const handleCalculate = () => {
    const isAllAssigned = items.every(item => {
      if (item.isSplitEqually) return Object.keys(item.assignedTo).length > 0;
      const assignedQty = Object.values(item.assignedTo).reduce((acc, val) => acc + val, 0);
      return assignedQty === item.qty;
    });

    if (!isAllAssigned) {
      if (!window.confirm("⚠️ Masih ada menu yang belum dibagi habis. Yakin ingin menghitung sekarang?")) return;
    }
    setStep(5);
  };

  const handlePriceInput = (e, index) => {
    const numericValue = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    const newItems = [...items];
    newItems[index].price = numericValue;
    setItems(newItems);
  };

  const getItemActualTotal = (item) => isUnitPriceMode ? (item.price * item.qty) : item.price;

  const getCalculatedTotals = () => {
    const totalSubtotal = items.reduce((sum, item) => sum + getItemActualTotal(item), 0);
    return friends.map(friend => {
      let friendSubtotal = 0;
      items.forEach(item => {
        if (item.assignedTo[friend.id]) {
          if (item.isSplitEqually) {
            friendSubtotal += getItemActualTotal(item) / Object.keys(item.assignedTo).length;
          } else {
            friendSubtotal += (isUnitPriceMode ? item.price : (item.price / item.qty)) * item.assignedTo[friend.id];
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

  // --- REUSABLE UI COMPONENTS ---
  const InputStyleBase = "p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-gray-800 font-medium";
  const InputStyle = `w-full ${InputStyleBase}`; // Style bawaan untuk yg butuh full width
  
  const MainButton = ({ onClick, children, disabled, variant = 'primary' }) => {
    const base = "w-full font-bold py-4 px-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-blue-500/30",
      success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-emerald-500/30",
      outline: "bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 shadow-sm"
    };
    return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>{children}</button>;
  };

  return (
    <div className="min-h-screen bg-gray-100 md:bg-gray-200 flex justify-center font-sans text-gray-800">
      
      <div className="w-full max-w-md bg-white md:my-8 md:rounded-[2.5rem] md:shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] md:h-[85vh] md:max-h-[850px]">
        
        <div className="h-1.5 w-full bg-gray-100 absolute top-0 z-20">
          <div className="h-full bg-blue-500 transition-all duration-500 rounded-r-full" style={{ width: `${(step / 5) * 100}%` }}></div>
        </div>

        <div className="flex justify-between items-center px-6 pt-6 pb-2 relative z-10 bg-white shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="p-2 -ml-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {step === 1 ? 'BagiRata' : step === 2 ? 'Cek Tagihan' : step === 3 ? 'Anggota' : step === 4 ? 'Pembagian' : 'Ringkasan'}
            </h2>
          </div>
          <button onClick={() => { setTempPaymentInfo(paymentInfo); setShowSettings(true); }} className="p-2.5 bg-gray-50 border border-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
            <Settings size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 custom-scrollbar">
          
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
              <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center shadow-inner mb-2">
                <Receipt size={48} className="text-blue-500" />
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
                <MainButton onClick={() => { setItems([{ id: 'm1', name: '', price: 0, qty: 1, assignedTo: {}, isSplitEqually: false }]); setStep(2); }} variant="outline">
                  <Edit2 size={20} className="text-gray-500" /> Input Manual
                </MainButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <p className="text-sm text-gray-500 mb-2">Biarkan nama menu kosong untuk menghapus</p>
              <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-xl border border-gray-100 shadow-inner">
                <button onClick={() => setIsUnitPriceMode(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isUnitPriceMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Total Harga</button>
                <button onClick={() => setIsUnitPriceMode(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isUnitPriceMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Harga Satuan</button>
              </div>

              <div className="space-y-3 mt-4">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2">
                    {/* Perbaikan Ukuran Input: Qty tetap kecil, Nama Menu melar, Harga proporsional */}
                    <input type="number" min="1" value={item.qty} onChange={(e) => { const newItems = [...items]; newItems[index].qty = parseInt(e.target.value) || 1; setItems(newItems); }} className={`${InputStyleBase} w-16 shrink-0 text-center text-blue-600`} placeholder="Qty" />
                    <input type="text" value={item.name} onChange={(e) => { const newItems = [...items]; newItems[index].name = e.target.value; setItems(newItems); }} className={`${InputStyleBase} flex-1 min-w-0`} placeholder="Nama Menu" />
                    <input type="text" inputMode="numeric" value={item.price ? item.price.toLocaleString('id-ID') : ''} onChange={(e) => handlePriceInput(e, index)} className={`${InputStyleBase} w-32 shrink-0 text-right`} placeholder={isUnitPriceMode ? "Satuan" : "Total"} />
                  </div>
                ))}
                <button onClick={() => setItems([...items, { id: `m${Date.now()}`, name: '', price: 0, qty: 1, assignedTo: {}, isSplitEqually: false }])} className="text-blue-600 font-bold text-sm flex items-center gap-1 mt-4 px-2 py-2 hover:bg-blue-50 rounded-lg transition-colors">
                  <Plus size={18} /> Tambah Menu Lain
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <p className="text-sm text-gray-500">Siapa saja yang ikut patungan hari ini?</p>
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input type="text" value={newFriendName} onChange={(e) => setNewFriendName(e.target.value)} placeholder="Ketik nama teman..." className={`${InputStyleBase} flex-1 min-w-0`} />
                <button type="submit" className="bg-blue-100 text-blue-600 px-4 rounded-xl hover:bg-blue-200 transition-colors active:scale-95"><Plus size={24} /></button>
              </form>
              <div className="space-y-2 mt-6">
                {friends.length === 0 && <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-2xl">Belum ada anggota</div>}
                {friends.map((friend) => (
                  <div key={friend.id} className="p-3.5 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2.5 rounded-full text-blue-600"><User size={18} /></div>
                    <span className="font-bold text-gray-700">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <p className="text-sm text-gray-500 mb-4">Klik pada menu untuk memilih siapa yang pesan.</p>
              {items.map((item) => {
                const assignedCount = Object.keys(item.assignedTo).length;
                const assignedQty = Object.values(item.assignedTo).reduce((acc, val) => acc + val, 0);
                const isFulfilled = item.isSplitEqually ? assignedCount > 0 : assignedQty === item.qty;
                const displayPrice = getItemActualTotal(item);

                return (
                  <button key={item.id} onClick={() => openModal(item)} className={`w-full text-left p-4 bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md active:scale-[0.99] ${isFulfilled ? 'border-green-200 bg-green-50/20' : 'border-gray-100 hover:border-blue-200'} flex justify-between items-center`}>
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs font-black">{item.qty}x</span>
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                      </div>
                      <p className="text-sm font-medium text-gray-500">Rp {displayPrice.toLocaleString('id-ID')}</p>
                      {item.isSplitEqually && assignedCount > 0 && <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-md tracking-wide uppercase">Dibagi {assignedCount} Orang</span>}
                    </div>
                    <div className={`shrink-0 h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        isFulfilled ? 'bg-green-100 text-green-700' : (assignedQty > 0 || assignedCount > 0) ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400 border border-gray-200'
                      }`}>
                      {isFulfilled ? <CheckCircle2 size={20} /> : item.isSplitEqually ? <Users size={18} /> : assignedQty > 0 ? `${assignedQty}/${item.qty}` : <Plus size={20} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
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
                  <button onClick={() => setRoundingMode(1)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 1 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Tepat</button>
                  <button onClick={() => setRoundingMode(500)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 500 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>500</button>
                  <button onClick={() => setRoundingMode(1000)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roundingMode === 1000 ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>1Rb</button>
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
            </div>
          )}
        </div>

        {step > 1 && (
          <div className="bg-white p-6 pt-4 border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0">
            {step === 2 && <MainButton onClick={handleNextFromStep2}>Lanjut ke Anggota <ArrowRight size={20} /></MainButton>}
            {step === 3 && <MainButton onClick={() => setStep(4)} disabled={friends.length < 1}>Mulai Bagi Tagihan <ArrowRight size={20} /></MainButton>}
            
            {step === 4 && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"><Edit2 size={16} /> Edit Menu</button>
                  <button onClick={() => setStep(3)} className="flex-1 bg-white border-2 border-gray-100 text-gray-600 font-bold py-2.5 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"><UserPlus size={16} /> Edit Teman</button>
                </div>
                <MainButton onClick={handleCalculate} variant="success"><CheckCircle2 size={20} /> Selesai & Hitung Total</MainButton>
              </div>
            )}
            
            {step === 5 && <MainButton onClick={handleShareWA} variant="success"><Share2 size={20} /> Bagikan ke WhatsApp</MainButton>}
          </div>
        )}

        {/* --- MODAL BOTTOM SHEET: PEMBAGIAN MENU --- */}
        {activeItemForAssignment && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={handleSaveAssignment}></div>
            <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 pb-8 relative z-10 animate-in slide-in-from-bottom-full duration-300">
              
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-extrabold text-2xl text-gray-900 leading-tight">{currentItem.name}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">{modalSplitMode === 'portion' ? `${currentItem.qty} Porsi Tersedia` : `Total Rp ${getItemActualTotal(currentItem).toLocaleString('id-ID')}`}</p>
                </div>
                <button onClick={handleSaveAssignment} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={20} /></button>
              </div>

              <div className="flex bg-gray-100 p-1.5 rounded-xl mb-5 shadow-inner">
                <button onClick={() => handleToggleModalMode('portion')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modalSplitMode === 'portion' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Bagi per Porsi</button>
                <button onClick={() => handleToggleModalMode('equal')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${modalSplitMode === 'equal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Bagi Rata</button>
              </div>

              {modalSplitMode === 'portion' && (
                <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-3 rounded-xl text-center font-bold mb-4 flex justify-between items-center text-sm">
                  <span>Porsi terbagikan:</span>
                  <span className={`text-lg font-black ${totalSelectedQty === currentItem.qty ? 'text-green-600' : 'text-blue-600'}`}>{totalSelectedQty} / {currentItem.qty}</span>
                </div>
              )}
              
              <div className="space-y-3 max-h-[45vh] overflow-y-auto mb-6 custom-scrollbar pr-1">
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
                          <button onClick={() => incrementQty(friend.id)} disabled={totalSelectedQty >= currentItem.qty} className={`p-1.5 rounded-full transition-all active:scale-90 ${totalSelectedQty < currentItem.qty ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}><Plus size={16} /></button>
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
                variant={(modalSplitMode === 'portion' && totalSelectedQty === currentItem.qty) || (modalSplitMode === 'equal' && Object.keys(tempSelections).length > 0) ? 'success' : 'primary'}
                disabled={Object.keys(tempSelections).length === 0 && modalSplitMode === 'equal'}
              >
                Simpan & Tutup
              </MainButton>
            </div>
          </div>
        )}

        {/* --- MODAL SETTINGS & RESET --- */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowSettings(false)}></div>
            <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 pb-8 relative z-10 animate-in slide-in-from-bottom-full duration-300">
              
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-xl text-gray-900">Pengaturan</h3>
                  <p className="text-xs font-medium text-gray-500 mt-1">Info pencairan dana otomatis tersimpan</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"><X size={20} /></button>
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
            </div>
          </div>
        )}

      </div>
    </div>
  );
}