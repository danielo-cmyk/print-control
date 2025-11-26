import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Printer, 
  User, 
  Clock, 
  Trash2, 
  Flame,
  ExternalLink,
  StickyNote,
  Hash,
  History,
  X,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileX,
  Archive,
  ArrowLeft,
  Settings,
  Monitor,
  LogOut,
  PauseCircle,
  Ticket,
  Save,
  Lock,
  UserPlus,
  ChevronDown,
  CloudDownload,
  Link,
  Ruler,
  Box,
  RefreshCcw,
  List,
  Users,
  Package,
  Calendar as CalendarIcon
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyB2XlTLG97XtqTA4lWd5mdJxj9cYxQBldU",
  authDomain: "printcontrol-app.firebaseapp.com",
  projectId: "printcontrol-app",
  storageBucket: "printcontrol-app.firebasestorage.app",
  messagingSenderId: "327550053348",
  appId: "1:327550053348:web:24bc38ed5cd6c79b54b5f1"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// FIX: Use a static, clean App ID to prevent path errors from system environment variables
const appId = 'print-master-control-app';

// --- LOGO COMPONENT ---
const MagenLogo = ({ size = 'normal', className = '' }) => {
  const isSmall = size === 'small';
  return (
    <div className={`flex items-baseline gap-0.5 select-none leading-none ${className}`}>
      <span className={`font-sans font-black text-[#cf1627] tracking-tighter ${isSmall ? 'text-lg' : 'text-3xl'}`}>
        Print
      </span>
      <span className={`font-sans font-bold text-slate-500 tracking-tight ${isSmall ? 'text-lg' : 'text-3xl'}`}>
        Control
      </span>
    </div>
  );
};

// --- STYLES FOR PRINTING ---
const printStyles = `
  @media print {
    @page {
      size: 60mm 40mm;
      margin: 0;
    }
    body * {
      visibility: hidden;
    }
    #ticket-print-area, #ticket-print-area * {
      visibility: visible;
    }
    #ticket-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 60mm;
      height: 40mm;
      padding: 2mm;
      background: white;
      color: black;
      display: flex !important;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }
  }
`;

// --- HELPER FUNCTIONS ---
const getDaysDifference = (dateString) => {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dateString.split('-').map(Number);
  const delivery = new Date(year, month - 1, day);
  const diffTime = delivery - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('es-CL', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const addBusinessDays = (startDate, daysToAdd) => {
  let currentDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      addedDays++;
    }
  }
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStatusColor = (dateString, status, isUrgent) => {
  if (status === 'Impreso') return 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
  if (status === 'En Pausa') return 'bg-slate-100 border-slate-300 text-slate-500 border-dashed';
  if (isUrgent) return 'bg-red-50 border-red-500 text-slate-800 shadow-red-100 shadow-md ring-1 ring-red-200';

  const diffDays = getDaysDifference(dateString);
  if (diffDays < 0) return 'bg-red-50 border-red-300';
  if (diffDays === 0) return 'bg-orange-50 border-orange-400';
  if (diffDays === 1) return 'bg-yellow-50 border-yellow-400';
  if (diffDays >= 2) return 'bg-green-50 border-green-300';
  return 'bg-white border-slate-200';
};

const getDateHeaderStyle = (dateString, isUrgent, status) => {
  if (status === 'En Pausa') return 'bg-slate-500 text-white';
  if (isUrgent) return 'bg-red-600 text-white animate-pulse font-black tracking-wider'; 
  
  const diffDays = getDaysDifference(dateString);
  if (diffDays < 0) return 'bg-red-800 text-white';
  if (diffDays === 0) return 'bg-orange-500 text-white';
  if (diffDays === 1) return 'bg-yellow-400 text-yellow-900';
  if (diffDays >= 2) return 'bg-green-600 text-white';
  return 'bg-slate-100 text-slate-500';
};

const getQualityAbbr = (quality) => {
  if (!quality || typeof quality !== 'string') return '';
  if (quality === 'Estándar') return 'STA';
  if (quality === 'Alta') return 'ALT';
  return quality.substring(0, 3).toUpperCase();
};

// --- COMPONENT: APP ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null); 
  const [appUser, setAppUser] = useState(null); 
  const [jobs, setJobs] = useState([]);
  const [config, setConfig] = useState({ 
    designers: ['Victor', 'Mayk', 'Directo Cliente'], 
    qualities: ['Estándar', 'Alta'],
    products: ['Pendón', 'Lienzo', 'Adhesivo', 'Papel', 'Troquelado'],
    users: [{name: 'Admin', pass: '1234'}]
  });

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingJobId, setEditingJobId] = useState(null);
  const [ticketData, setTicketData] = useState(null); 

  const [formData, setFormData] = useState({
    orderNumber: '', client: '', products: [], note: '', 
    designer: '', createdBy: '', deliveryDate: '', 
    isUrgent: false, isFileUploaded: false, status: 'Aceptado', history: [],
    archived: false
  });
  
  const [tempProduct, setTempProduct] = useState('');
  const [tempQuality, setTempQuality] = useState('');
  const [tempQty, setTempQty] = useState(1);
  const [tempWidth, setTempWidth] = useState('');
  const [tempHeight, setTempHeight] = useState('');
  const [businessDays, setBusinessDays] = useState('');
  const [settingsTab, setSettingsTab] = useState('general');

  const dateInputRef = useRef(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // --- AUTH & DATA LOADING ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setFirebaseUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    
    // Subscribe to Jobs
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'print_orders'));
    const unsubJobs = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs:", error);
      setLoading(false);
    });

    // Subscribe to Config
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'general_settings');
    const unsubConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setConfig(prev => ({ ...prev, ...docSnap.data() }));
      else {
        // Initialize defaults if not exists
        setDoc(configRef, { 
          designers: ['Victor', 'Mayk', 'Directo Cliente'], 
          qualities: ['Estándar', 'Alta'], 
          products: ['Pendón', 'Lienzo'], 
          users: [{name: 'Admin', pass: '1234'}] 
        });
      }
    }, (error) => {
        console.error("Error fetching config:", error);
    });

    return () => { unsubJobs(); unsubConfig(); };
  }, [firebaseUser]);

  useEffect(() => {
    if (config.qualities.length > 0 && !tempQuality) setTempQuality(config.qualities[0]);
  }, [config]);

  useEffect(() => {
    if (ticketData) {
      const timer = setTimeout(() => { window.print(); setTicketData(null); }, 500); 
      return () => clearTimeout(timer);
    }
  }, [ticketData]);

  // --- FUNCTIONS ---

  const saveConfig = async (newConfig) => {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_config', 'general_settings'), newConfig);
      setConfig(newConfig);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingJobId(null); 
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const foundUser = config.users.find(u => u.name.toLowerCase() === loginData.username.toLowerCase() && u.pass === loginData.password);
    if (foundUser) {
      setAppUser(foundUser);
      setLoginError('');
      localStorage.setItem('printMasterUser', JSON.stringify(foundUser));
    } else setLoginError('Credenciales incorrectas');
  };

  const handleLogout = () => { setAppUser(null); localStorage.removeItem('printMasterUser'); };
  
  useEffect(() => { const u = localStorage.getItem('printMasterUser'); if (u) setAppUser(JSON.parse(u)); }, []);

  const handleDelete = async (jobId) => {
    if(window.confirm('¿Estás seguro de eliminar esta orden para siempre?')) { 
        await deleteDoc(doc(db,'artifacts',appId,'public','data','print_orders',jobId)); 
        closeModal(); 
    }
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    if (formData.status !== 'Aceptado' && formData.status !== 'En Pausa' && !formData.designer) {
      alert("Debes asignar un Diseñador para este estado.");
      return;
    }
    let finalStatus = formData.status;
    if (formData.designer === 'Directo Cliente' && finalStatus !== 'Impreso' && finalStatus !== 'En Pausa') finalStatus = 'Listo para Impresión';

    const jobData = { ...formData, status: finalStatus, updatedAt: new Date().toISOString() };

    try {
      if (editingJobId) {
        const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', editingJobId);
        const oldJob = jobs.find(j => j.id === editingJobId);
        const changes = [];
        if (oldJob.status !== jobData.status) changes.push(`Estado: ${oldJob.status} -> ${jobData.status}`);
        if (oldJob.designer !== jobData.designer) changes.push(`Diseñador: ${oldJob.designer} -> ${jobData.designer}`);
        if (changes.length === 0) changes.push("Edición de detalles");
        if (jobData.status === 'Impreso' && oldJob.status !== 'Impreso') jobData.finishedAt = new Date().toISOString();
        
        await updateDoc(jobRef, { ...jobData, history: [{ date: new Date().toISOString(), action: changes.join(', '), user: appUser.name }, ...(oldJob.history || [])] });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'print_orders'), {
          ...jobData, createdBy: appUser.name, entryDate: new Date().toISOString(), createdAt: serverTimestamp(),
          history: [{ date: new Date().toISOString(), action: "Orden Creada", user: appUser.name }]
        });
      }
      closeModal();
    } catch (error) { console.error(error); }
  };

  const handleUpdateStatus = async (job, newStatus) => {
    if (job.status === newStatus) return;
    
    if (newStatus !== 'Aceptado' && newStatus !== 'En Pausa' && !job.designer) {
       alert("⚠️ Debes asignar un diseñador antes de avanzar.");
       openEditModal(job); 
       return;
    }

    if (newStatus === 'En Diseño') {
      if (job.designer) {
         const confirmChange = window.confirm(`Diseñador actual: ${job.designer}.\n¿Deseas cambiarlo?\n\nAceptar: CAMBIAR.\nCancelar: MANTENER Y AVANZAR.`);
         if (confirmChange) {
            openEditModal(job);
            return;
         }
      } else {
         const confirmSelf = window.confirm(`¿Asignar a ${appUser.name}?\nAceptar: SÍ.\nCancelar: ELEGIR OTRO.`);
         if (confirmSelf) {
             const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
             await updateDoc(jobRef, { 
               status: newStatus, designer: appUser.name, updatedAt: new Date().toISOString(),
               history: [{ date: new Date().toISOString(), action: `Movido a Diseño por ${appUser.name}`, user: appUser.name }, ...(job.history||[])]
             });
             return;
         } else {
             openEditModal(job);
             return;
         }
      }
    }
    await performStatusUpdate(job, newStatus);
  };

  const handleUpdateDesigner = async (job, newDesigner) => {
    if (job.designer === newDesigner) return;
    const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
    await updateDoc(jobRef, { 
      designer: newDesigner,
      history: [{ date: new Date().toISOString(), action: `Diseñador cambiado a: ${newDesigner}`, user: appUser.name }, ...(job.history||[])]
    });
  };

  const performStatusUpdate = async (job, newStatus) => {
    const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
    const updates = { status: newStatus, updatedAt: new Date().toISOString(), history: [{ date: new Date().toISOString(), action: `Movido a: ${newStatus}`, user: appUser.name }, ...(job.history||[])] };
    if (newStatus === 'Impreso') updates.finishedAt = new Date().toISOString();
    await updateDoc(jobRef, updates);
  };

  const handleToggleUrgent = async (job) => {
    const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
    await updateDoc(jobRef, { isUrgent: !job.isUrgent, history: [{ date: new Date().toISOString(), action: `Urgencia: ${!job.isUrgent}`, user: appUser.name }, ...(job.history||[])] });
  };

  const handleToggleFile = async (job) => {
    const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
    await updateDoc(jobRef, { isFileUploaded: !job.isFileUploaded, history: [{ date: new Date().toISOString(), action: `Archivos: ${!job.isFileUploaded ? 'OK' : 'Pendiente'}`, user: appUser.name }, ...(job.history||[])] });
  };

  const handleArchiveJob = async (job) => {
     const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
     await updateDoc(jobRef, { archived: true, history: [{ date: new Date().toISOString(), action: "Archivado manualmente", user: appUser.name }, ...(job.history||[])] });
  };

  const handleUnarchiveJob = async (job) => {
     const jobRef = doc(db, 'artifacts', appId, 'public', 'data', 'print_orders', job.id);
     await updateDoc(jobRef, { 
       archived: false, 
       finishedAt: new Date().toISOString(), 
       history: [{ date: new Date().toISOString(), action: "Restaurado al tablero", user: appUser.name }, ...(job.history||[])] 
    });
  };

  // --- TICKET GENERATION ---
  const openTicketWindow = (job) => {
    const win = window.open('', '_blank', 'width=400,height=400');
    if (!win) return;

    const dateStr = formatDate(job.deliveryDate).split(',')[0];
    const now = new Date().toLocaleString('es-CL');

    const products = Array.isArray(job.products) 
      ? job.products.map(p => (typeof p === 'string' ? { name: p, quality: 'Estándar', qty: 1, size: '' } : p)) 
      : (job.description ? [{name: job.description, quality: 'Estándar', qty: 1, size: ''}] : []);

    const productsHtml = products.map(p => 
      `<div style="font-size: 10px; margin-bottom: 2px; border-bottom: 1px dotted #ccc; padding-bottom: 1px;">
         <div style="font-weight:bold;">${getQualityAbbr(p.quality)} - ${p.qty || 1}x ${p.name}</div>
         <div style="font-size:9px;">${p.size ? `${p.size} cm` : ''}</div>
       </div>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket #${job.orderNumber}</title>
        <style>
          @page { size: 60mm 40mm; margin: 0; }
          body { margin: 0; padding: 2mm; font-family: sans-serif; width: 60mm; height: 40mm; box-sizing: border-box; overflow: hidden; }
          .container { display: flex; flex-direction: column; height: 100%; justify-content: space-between; }
          .header { border-bottom: 2px solid #000; padding-bottom: 2px; margin-bottom: 2px; text-align: center; }
          .logo { font-weight: 900; font-size: 14px; color: #cf1627; line-height: 1; }
          .logo span { color: #64748b; font-weight: bold; }
          .order { font-size: 16px; font-weight: 900; margin-top: 2px; }
          .content { flex: 1; display: flex; flex-direction: column; justify-content: flex-start; overflow: hidden; }
          .row { margin-bottom: 2px; }
          .label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555; }
          .value { font-size: 11px; font-weight: 800; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .products { margin-top: 2px; padding-top: 2px; }
          .footer { border-top: 1px solid #ccc; padding-top: 2px; font-size: 8px; text-align: center; color: #888; margin-top: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Print <span>Control</span></div>
            <div class="order">ORDEN #${job.orderNumber || 'S/N'}</div>
          </div>
          <div class="content">
            <div class="row">
              <div class="label">CLIENTE:</div>
              <div class="value">${job.client}</div>
            </div>
            <div class="row">
              <div class="label">ENTREGA:</div>
              <div class="value">${dateStr}</div>
            </div>
            <div class="products">
               ${productsHtml}
            </div>
          </div>
          <div class="footer">
            Impreso: ${now}
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    
    win.document.write(html);
    win.document.close();
  };

  // --- UI HELPERS ---
  const openNewModal = () => {
    setEditingJobId(null);
    setFormData({ orderNumber: '', client: '', products: [], note: '', designer: '', createdBy: appUser.name, deliveryDate: '', isUrgent: false, isFileUploaded: false, status: 'Aceptado', history: [], archived: false });
    setTempQuality('');
    setTempQty(1);
    setTempWidth('');
    setTempHeight('');
    setBusinessDays(''); 
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJobId(job.id);
    let normProds = job.products || [];
    if (normProds.length > 0 && typeof normProds[0] === 'string') normProds = normProds.map(p => ({ name: p, quality: job.quality || config.qualities[0], qty: 1, size: '' }));
    else if (!job.products && job.description) normProds = [{ name: job.description, quality: job.quality || config.qualities[0], qty: 1, size: '' }];
    setFormData({ ...job, products: normProds, designer: job.designer || '', quality: job.quality || '' });
    setTempQuality(''); 
    setTempQty(1);
    setTempWidth('');
    setTempHeight('');
    setBusinessDays('');
    setIsModalOpen(true);
  };

  const addProduct = (e) => {
    e.preventDefault(); if (!tempProduct.trim()) return;
    if (!tempQuality) { alert("⚠️ Selecciona una calidad para el producto."); return; }
    
    let combinedSize = '';
    if (tempWidth && tempHeight) {
      combinedSize = `${tempWidth}x${tempHeight}`;
    } else if (tempWidth) {
      combinedSize = tempWidth; 
    }

    setFormData({ 
      ...formData, 
      products: [...(formData.products || []), { 
        name: tempProduct.trim(), 
        quality: tempQuality, 
        qty: tempQty,
        size: combinedSize
      }] 
    });
    setTempProduct('');
    setTempQty(1);
    setTempWidth('');
    setTempHeight('');
  };

  const handleBusinessDaysChange = (e) => {
    const val = e.target.value;
    setBusinessDays(val);
    const days = parseInt(val);
    if (!isNaN(days) && days >= 0) {
      const newDate = addBusinessDays(new Date(), days);
      setFormData(prev => ({ ...prev, deliveryDate: newDate }));
    }
  };

  const handleDateChange = (e) => {
    setFormData(prev => ({ ...prev, deliveryDate: e.target.value }));
    setBusinessDays(''); 
  };

  // --- RENDERING ---
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Cargando...</div>;
  if (!appUser) return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm flex flex-col items-center">
         <div className="mb-8 scale-150"><MagenLogo /></div>
         <form onSubmit={handleLogin} className="space-y-4 w-full">
            <input type="text" placeholder="Usuario" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} autoFocus/>
            <input type="password" placeholder="Contraseña" className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})}/>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">Ingresar</button>
         </form>
      </div>
    </div>
  );

  // RENDER HISTORIAL (ARCHIVED)
  if (showArchived) {
     const archivedList = jobs.filter(j => j.archived || (j.status === 'Impreso' && j.finishedAt && (new Date() - new Date(j.finishedAt)) / 36e5 >= 48));
     return (
       <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
          <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-2"><button onClick={()=>setShowArchived(false)} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft/></button><h1 className="font-bold text-xl">Archivo Histórico</h1></div>
             <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-bold">{archivedList.length} órdenes</span>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
             <div className="max-w-4xl mx-auto space-y-2">
               {archivedList.map(job => (
                 <div key={job.id} className="bg-white p-4 rounded border flex justify-between items-center">
                    <div>
                       <div className="font-black">#{job.orderNumber} - {job.client}</div>
                       <div className="text-xs text-slate-400">Finalizado: {job.finishedAt ? new Date(job.finishedAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <button onClick={() => handleUnarchiveJob(job)} className="text-blue-600 hover:bg-blue-50 p-2 rounded flex items-center gap-2 text-sm font-bold"><RefreshCcw size={16}/> Restaurar</button>
                 </div>
               ))}
             </div>
          </div>
       </div>
     );
  }

  // RENDER BOARD
  const now = new Date();
  const activeJobs = jobs.filter(job => {
    if (job.archived) return false; 
    if (job.status === 'En Pausa') return true;
    // Show for 48 hours
    if (job.status === 'Impreso' && job.finishedAt) return (now - new Date(job.finishedAt)) / (1000 * 60 * 60) < 48; 
    return true;
  });
  const columns = {
    'Aceptado': activeJobs.filter(j => j.status === 'Aceptado'),
    'En Diseño': activeJobs.filter(j => j.status === 'En Diseño'),
    'Listo para Impresión': activeJobs.filter(j => j.status === 'Listo para Impresión'),
    'En Pausa': activeJobs.filter(j => j.status === 'En Pausa'),
    'Impreso': activeJobs.filter(j => j.status === 'Impreso'),
  };
  const sortColumn = (list) => list.sort((a, b) => (a.isUrgent && !b.isUrgent ? -1 : (!a.isUrgent && b.isUrgent ? 1 : new Date(a.deliveryDate) - new Date(b.deliveryDate))));
  
  const renderJobCard = (job, isDone=false, isCompact=false) => (
    <JobCard 
      key={job.id} 
      job={job} 
      designers={config.designers}
      onClick={() => openEditModal(job)} 
      onPrint={() => openTicketWindow(job)} 
      onToggleUrgent={() => handleToggleUrgent(job)} 
      onToggleFile={() => handleToggleFile(job)} 
      onUpdateDesigner={(newVal) => handleUpdateDesigner(job, newVal)}
      onArchive={() => handleArchiveJob(job)}
      isDone={isDone} 
      isCompact={isCompact}
    />
  );

  return (
    <>
      <style>{printStyles}</style>
      <div className="h-screen bg-slate-100 text-slate-800 font-sans flex flex-col overflow-hidden">
        {!isTvMode && (
          <header className="bg-white shadow-sm z-10 px-6 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4"><MagenLogo /><div className="h-8 w-px bg-slate-200"></div><div><p className="text-xs text-slate-500 font-medium">Bienvenido,</p><h1 className="text-sm font-bold">{appUser.name}</h1></div></div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsTvMode(true)} className="p-2 text-slate-500 hover:text-blue-600" title="Modo TV"><Monitor size={20}/></button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-blue-600" title="Config"><Settings size={20}/></button>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <button onClick={openNewModal} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg text-sm font-bold"><Plus size={18}/> Nueva Orden</button>
            </div>
          </header>
        )}
        {isTvMode && <button onClick={() => setIsTvMode(false)} className="absolute top-4 right-4 z-50 bg-black/20 hover:bg-black/50 text-white p-2 rounded-full"><X size={24}/></button>}
        
        <main className={`flex-1 overflow-x-auto overflow-y-hidden p-4 ${isTvMode ? 'bg-slate-900 text-slate-100' : ''}`}>
          <div className="flex h-full gap-4 min-w-[1200px] md:min-w-0">
            <KanbanColumn title="Aceptados" status="Aceptado" count={columns['Aceptado'].length} color="indigo" icon={<Hash size={16}/>} onDropJob={(e,s) => {e.preventDefault(); const id=e.dataTransfer.getData("jobId"); const j=jobs.find(x=>x.id===id); if(j && j.status!==s) handleUpdateStatus(j,s);}} isTvMode={isTvMode}>{sortColumn(columns['Aceptado']).map(j => renderJobCard(j))}</KanbanColumn>
            <KanbanColumn title="En Diseño" status="En Diseño" count={columns['En Diseño'].length} color="blue" icon={<Edit3 size={16}/>} onDropJob={(e,s) => {e.preventDefault(); const id=e.dataTransfer.getData("jobId"); const j=jobs.find(x=>x.id===id); if(j && j.status!==s) handleUpdateStatus(j,s);}} isTvMode={isTvMode}>{sortColumn(columns['En Diseño']).map(j => renderJobCard(j))}</KanbanColumn>
            <KanbanColumn title="Listo Impresión" status="Listo para Impresión" count={columns['Listo para Impresión'].length} color="purple" icon={<Printer size={16}/>} onDropJob={(e,s) => {e.preventDefault(); const id=e.dataTransfer.getData("jobId"); const j=jobs.find(x=>x.id===id); if(j && j.status!==s) handleUpdateStatus(j,s);}} isTvMode={isTvMode}>{sortColumn(columns['Listo para Impresión']).map(j => renderJobCard(j))}</KanbanColumn>
            <div className={`flex-1 flex gap-4 min-w-[340px] max-w-lg h-full`}>
               <div className={`flex-1 flex flex-col h-full rounded-xl overflow-hidden border ${isTvMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/50 border-slate-200'}`}>
                  <div className="p-2 border-b flex justify-between items-center bg-green-50 text-green-700">
                      <div className="flex items-center gap-1 font-bold text-xs uppercase"><CheckCircle2 size={14}/> Listo</div>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setShowArchived(true)} className="text-green-600 hover:bg-green-100 p-1 rounded" title="Ver Archivo Histórico"><Box size={16}/></button>
                          <span className="bg-white px-1.5 rounded text-[10px] font-bold">{columns['Impreso'].length}</span>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const id=e.dataTransfer.getData("jobId"); const j=jobs.find(x=>x.id===id); if(j && j.status!=='Impreso') handleUpdateStatus(j,'Impreso');}}>{sortColumn(columns['Impreso']).map(j => renderJobCard(j, true))}</div>
               </div>
               <div className={`flex-1 flex flex-col h-full rounded-xl overflow-hidden border ${isTvMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/50 border-slate-200'}`}>
                  <div className="p-2 border-b flex justify-between items-center bg-slate-100/50 text-slate-600"><div className="flex items-center gap-1 font-bold text-xs uppercase"><PauseCircle size={14}/> Pausado</div><span className="bg-white px-1.5 rounded text-[10px] font-bold">{columns['En Pausa'].length}</span></div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const id=e.dataTransfer.getData("jobId"); const j=jobs.find(x=>x.id===id); if(j && j.status!=='En Pausa') handleUpdateStatus(j,'En Pausa');}}>{sortColumn(columns['En Pausa']).map(j => renderJobCard(j, false, true))}</div>
               </div>
            </div>
          </div>
        </main>

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0"><h2 className="font-bold text-lg flex items-center gap-2"><Settings size={20}/> Configuración</h2><button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-slate-400"/></button></div>
                
                {/* TABS HEADER */}
                <div className="flex border-b shrink-0">
                   <button onClick={() => setSettingsTab('general')} className={`flex-1 py-3 text-sm font-bold transition-colors ${settingsTab === 'general' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>General</button>
                   <button onClick={() => setSettingsTab('products')} className={`flex-1 py-3 text-sm font-bold transition-colors ${settingsTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Productos</button>
                   <button onClick={() => setSettingsTab('users')} className={`flex-1 py-3 text-sm font-bold transition-colors ${settingsTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>Usuarios</button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                   {settingsTab === 'general' && (
                      <div className="space-y-6">
                         <SettingsListEditor title="Diseñadores" items={config.designers} onSave={(n) => saveConfig({...config, designers: n})} />
                         <SettingsListEditor title="Calidades" items={config.qualities} onSave={(n) => saveConfig({...config, qualities: n})} />
                      </div>
                   )}

                   {settingsTab === 'products' && (
                      <SettingsListEditor title="Productos Frecuentes" items={config.products || ['Pendón', 'Lienzo']} onSave={(n) => saveConfig({...config, products: n})} />
                   )}

                   {settingsTab === 'users' && (
                      <div>
                         <h3 className="font-bold text-sm text-slate-700 mb-2 flex items-center gap-2"><Users size={16}/> Usuarios del Sistema</h3>
                         <div className="space-y-2">
                            {config.users.map((u, idx) => (
                               <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border text-sm">
                                  <span>{u.name}</span>
                                  <button onClick={() => { const n = [...config.users]; n.splice(idx, 1); saveConfig({...config, users: n}); }} className="text-red-400"><Trash2 size={14}/></button>
                               </div>
                            ))}
                            <form onSubmit={e => { e.preventDefault(); const n = e.target.u.value; const p = e.target.p.value; if(n && p) { saveConfig({...config, users: [...config.users, {name:n, pass:p}]}); e.target.reset(); }}} className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                               <input name="u" placeholder="Nombre" className="flex-1 px-2 py-1 border rounded text-sm outline-none focus:border-blue-500"/>
                               <input name="p" placeholder="Clave" className="w-24 px-2 py-1 border rounded text-sm outline-none focus:border-blue-500"/>
                               <button className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700"><Plus size={16}/></button>
                            </form>
                         </div>
                      </div>
                   )}
                </div>

                <div className="p-4 border-t shrink-0 bg-slate-50">
                   <button onClick={handleLogout} className="w-full py-2 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-lg font-bold transition-colors shadow-sm"><LogOut size={16} /> Cerrar Sesión</button>
                </div>
             </div>
          </div>
        )}

        {/* JOB MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col animate-in zoom-in duration-200">
               <div className="px-6 py-4 border-b flex justify-between items-center"><h2 className="font-bold text-xl flex items-center gap-2">{editingJobId ? <><Edit3 size={20} className="text-blue-600"/> Editar Orden</> : <><Plus size={20} className="text-blue-600"/> Nueva Orden</>}</h2><button onClick={closeModal}><X size={20} className="text-slate-400"/></button></div>
               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <form id="jobForm" onSubmit={handleSaveJob} className="space-y-6">
                     <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Orden</label>
                           <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="12345" className="w-full pl-9 pr-3 py-2 font-bold border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.orderNumber} onChange={e => setFormData({...formData, orderNumber: e.target.value})} />
                              </div>
                           </div>
                        </div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label><input type="text" required placeholder="Cliente" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} /></div>
                     </div>
                     {/* Row 2: Date, Urgent, Designer - FIXED LAYOUT */}
                     <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entrega (Días Hábiles)</label>
                          <div className="flex gap-2 items-center">
                             <div className="relative w-20 flex-shrink-0">
                               <input 
                                 type="number" 
                                 min="0"
                                 placeholder="Días" 
                                 className="w-full px-3 py-2 border rounded-lg outline-none text-sm font-bold text-center" 
                                 value={businessDays}
                                 onChange={handleBusinessDaysChange}
                               />
                             </div>
                             <div className="relative">
                                <input 
                                  type="date" 
                                  ref={dateInputRef}
                                  className="absolute inset-0 opacity-0 w-full cursor-pointer"
                                  value={formData.deliveryDate} 
                                  onChange={handleDateChange}
                                />
                                <button type="button" className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors"><CalendarIcon size={20} className="text-slate-600"/></button>
                             </div>
                             {formData.deliveryDate && (
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
                                   {new Date(formData.deliveryDate + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                             )}
                          </div>
                        </div>
                        <div><label className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors h-[42px] ${formData.isUrgent ? 'bg-red-100 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}><input type="checkbox" className="hidden" checked={formData.isUrgent} onChange={e => setFormData({...formData, isUrgent: e.target.checked})} /><Flame size={18} /> <span className="text-sm font-bold">URGENTE</span></label></div>
                        <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diseñador (Opcional)</label><select className="w-full px-3 py-2 border rounded-lg bg-white outline-none" value={formData.designer} onChange={e => setFormData({...formData, designer: e.target.value})}><option value="">-- Sin asignar --</option>{config.designers.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                     </div>
                     <hr className="border-slate-100" />
                     
                     {/* PRODUCT ADDITION ROW */}
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Package size={16}/> Agregar Productos</label>
                        <div className="flex gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-200">
                           <div className="w-14">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 text-center">CANT</label>
                              <input type="number" min="1" className="w-full px-1 py-2 border rounded-lg text-center font-bold outline-none focus:border-blue-500" value={tempQty} onChange={e => setTempQty(e.target.value)} />
                           </div>
                           <div className="flex-[2]">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 text-center">PRODUCTO</label>
                              <input 
                                list="product-list" 
                                type="text" 
                                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                value={tempProduct} 
                                onChange={e => setTempProduct(e.target.value)} 
                              />
                              <datalist id="product-list">
                                 {(config.products || ['Pendón', 'Lienzo']).map(p => <option key={p} value={p} />)}
                              </datalist>
                           </div>
                           <div className="flex-1">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 text-center">MEDIDA (cm)</label>
                              <div className="flex items-center gap-1">
                                <input type="text" placeholder="Ancho" className="w-full px-2 py-2 border rounded-lg outline-none text-sm text-center" value={tempWidth} onChange={e => setTempWidth(e.target.value)} />
                                <span className="text-slate-400 text-xs">x</span>
                                <input type="text" placeholder="Alto" className="w-full px-2 py-2 border rounded-lg outline-none text-sm text-center" value={tempHeight} onChange={e => setTempHeight(e.target.value)} />
                              </div>
                           </div>
                           <div className="w-20">
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 text-center">CALIDAD</label>
                              <select className="w-full px-1 py-2 border rounded-lg bg-white outline-none text-xs font-bold text-center" value={tempQuality} onChange={e => setTempQuality(e.target.value)}>
                                <option value="">...</option>
                                {config.qualities.map(q => <option key={q} value={q}>{getQualityAbbr(q)}</option>)}
                              </select>
                           </div>
                           <button type="button" onClick={addProduct} className="bg-slate-800 hover:bg-black text-white px-3 h-[38px] rounded-lg flex items-center justify-center mb-[1px]"><Plus size={20}/></button>
                        </div>

                        <div className="space-y-2 mt-3">
                           {formData.products?.map((prod, idx) => (
                              <div key={idx} className={`flex justify-between items-center p-2 rounded-lg border text-sm ${prod.quality === 'Alta' ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-200'}`} title="Tooltip con detalle completo">
                                 <div className="flex items-center gap-3 w-full group/item relative">
                                    <span className="font-bold text-slate-500 text-lg">{prod.qty || 1}x</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border min-w-[35px] text-center ${prod.quality === 'Alta' ? 'bg-blue-600 text-white' : 'bg-purple-200 text-purple-700'}`}>{getQualityAbbr(prod.quality)}</span>
                                    <div className="flex flex-col leading-tight flex-1 min-w-0">
                                        <span className="font-bold text-slate-700 truncate">{prod.name}</span>
                                        {prod.size && <span className="text-[11px] text-slate-400 font-mono">{prod.size} cm</span>}
                                    </div>
                                 </div>
                                 <button type="button" onClick={() => {const np=[...formData.products]; np.splice(idx,1); setFormData({...formData, products:np})}} className="text-slate-400 hover:text-red-500 ml-2"><X size={16}/></button>
                              </div>
                           ))}
                        </div>
                     </div>

                     <hr className="border-slate-100" />
                     <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas</label><textarea rows="2" className="w-full px-3 py-2 border rounded-lg bg-yellow-50 border-yellow-200 outline-none" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} /></div>
                     {/* History Block */}
                     {editingJobId && formData.history && formData.history.length > 0 && (<div className="mt-4 pt-4 border-t border-slate-100"><h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex gap-1"><History size={12}/> Historial de Acciones</h3><div className="max-h-32 overflow-y-auto space-y-2 pr-2">{formData.history.map((h, i) => (<div key={i} className="text-[10px] text-slate-500 flex justify-between bg-slate-50 p-1.5 rounded border border-slate-100"><span>{h.action} <span className="text-slate-400">por {h.user}</span></span><span className="font-mono">{new Date(h.date).toLocaleString()}</span></div>))}</div></div>)}
                     <div className="pt-4 flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 flex gap-1 items-center"><UserPlus size={12}/> Creado por: <strong>{formData.createdBy || appUser.name}</strong></div>
                        <div className="flex-1 ml-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-right">Estado Actual</label><select className="w-full px-3 py-2 border rounded-lg bg-slate-50 font-medium outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="Aceptado">Aceptado / En Cola</option><option value="En Diseño">En Diseño</option><option value="Listo para Impresión">Listo para Impresión</option><option value="En Pausa">En Pausa</option><option value="Impreso">Impreso</option></select></div>
                     </div>
                  </form>
               </div>
               <div className="p-4 border-t bg-slate-50 flex justify-between rounded-b-xl">{editingJobId && <button type="button" onClick={() => handleDelete(editingJobId)} className="text-red-600 flex items-center gap-2 font-bold px-4 py-2 hover:bg-red-50 rounded-lg"><Trash2 size={16}/> Eliminar</button>}<div className="flex gap-3 ml-auto"><button type="button" onClick={closeModal} className="px-4 py-2 border rounded-lg font-bold text-slate-600">Cancelar</button><button type="submit" form="jobForm" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg">Guardar</button></div></div>
             </div>
          </div>
        )}
      </div>
    </>
  );
}

function JobCard({ job, designers, onClick, onPrint, onToggleUrgent, onToggleFile, onUpdateDesigner, onArchive, isDone, isCompact }) {
  const cardStyle = getStatusColor(job.deliveryDate, job.status, job.isUrgent);
  const headerDateStyle = getDateHeaderStyle(job.deliveryDate, job.isUrgent, job.status);
  
  let dateLabel = new Date(job.deliveryDate + 'T00:00:00').toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'});
  const diff = getDaysDifference(job.deliveryDate);
  if (job.isUrgent) dateLabel = "IMPRESIÓN URGENTE";
  else {
    if (diff === 0) dateLabel = "HOY";
    if (diff === 1) dateLabel = "MAÑANA";
    if (diff < 0) dateLabel = "ATRASADO";
    if (diff >= 2) dateLabel = `ENTREGA: ${dateLabel}`; 
    if (job.status === 'En Pausa') dateLabel = "EN PAUSA";
  }

  if (isDone || isCompact) {
    return (
      <div draggable={true} onDragStart={e => { e.dataTransfer.setData("jobId", job.id); e.dataTransfer.effectAllowed = "move"; }} onClick={onClick} className={`relative p-2 rounded-lg border bg-white hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-2 ${job.status === 'En Pausa' ? 'border-dashed border-slate-400 opacity-75' : 'border-slate-200 opacity-60 hover:opacity-100'}`}>
        <div className="flex flex-col min-w-0"><span className="font-black text-slate-500 text-sm">#{job.orderNumber}</span><span className="text-xs truncate text-slate-600 font-medium">{job.client}</span></div>
        {isDone && <button onClick={(e) => {e.stopPropagation(); onArchive()}} className="text-slate-300 hover:text-red-500 p-1" title="Archivar"><Archive size={14}/></button>}
        {!isDone && !isCompact && <button onClick={(e) => {e.stopPropagation(); onPrint()}} className="text-slate-300 hover:text-slate-600 p-1" title="Imprimir Ticket"><Printer size={14}/></button>}
      </div>
    );
  }

  const products = Array.isArray(job.products) 
    ? job.products.map(p => (typeof p === 'string' ? { name: p, quality: 'Estándar', qty: 1, size: '' } : p)) 
    : (job.description ? [{name: job.description, quality: 'Estándar', qty: 1}] : []);

  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData("jobId", job.id); e.dataTransfer.effectAllowed = "move"; }} onClick={onClick} className={`relative rounded-lg shadow-sm border border-l-4 cursor-pointer hover:shadow-md transition-all group active:cursor-grabbing pb-3 overflow-hidden ${cardStyle}`}>
      <div className={`w-full py-1 text-center text-[10px] font-bold uppercase tracking-widest relative flex justify-between items-center px-2 ${headerDateStyle}`}>
         <button onClick={(e) => {e.stopPropagation(); onPrint()}} className="text-white/80 hover:text-white transition-colors" title="Imprimir Ticket"><Printer size={12}/></button>
         <span>{dateLabel}</span>
         <button onClick={(e) => { e.stopPropagation(); onToggleUrgent(); }} className={`${job.isUrgent ? 'text-white' : 'text-white/60 hover:text-white'}`} title="Toggle Urgente"><Flame size={14} fill={job.isUrgent ? "currentColor" : "none"} /></button>
      </div>
      <div className="px-4 pt-3 relative">
        <div className="mb-3 flex items-center gap-2">
           <span className="text-xl font-black text-slate-800">#{job.orderNumber || '---'}</span>
           <span className="text-xs font-bold text-slate-600 uppercase truncate flex-1">{job.client}</span>
        </div>
        <div className="space-y-1 mb-3">{products.slice(0, 3).map((prod, i) => (
           <div key={i} className={`flex items-center gap-2 text-xs p-1 rounded border ${prod.quality === 'Alta' ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-purple-50 border-purple-100 text-purple-900'}`} title={`${prod.name} (${prod.size})`}>
              <span className={`text-[9px] font-bold uppercase px-1 rounded ${prod.quality === 'Alta' ? 'bg-blue-600 text-white' : 'bg-purple-200 text-purple-700'}`}>{getQualityAbbr(prod.quality)}</span>
              <span className="font-bold text-[10px]">{prod.qty || 1}x</span>
              <span className="line-clamp-1 font-medium flex-1 truncate">{prod.name}</span>
              {prod.size && <span className="text-[10px] text-slate-400 whitespace-nowrap">({prod.size})</span>}
           </div>
        ))}{(products.length || 0) > 3 && <span className="text-[10px] text-slate-400 pl-1 italic">+{products.length - 3} más...</span>}</div>
      </div>
      <div className="flex items-center justify-between mt-2 px-4 pt-2 border-t border-slate-200/50">
         <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-1 mb-0.5"><User size={10} className="text-slate-400"/><span className="text-[9px] text-slate-400 font-bold uppercase">DISEÑADOR</span></div>
            <div className="bg-slate-100 px-2 py-1.5 rounded relative group/select w-full">
                <div className="relative">
                    <select 
                      value={job.designer || ""}
                      onChange={(e) => onUpdateDesigner(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent outline-none appearance-none w-full cursor-pointer text-slate-700 font-bold text-[11px] truncate pr-4"
                    >
                      <option value="" disabled>Sin Asignar</option>
                      {designers && designers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                </div>
            </div>
         </div>
         <div className="flex flex-col items-end gap-0.5 ml-2">
             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Archivo:</span>
             <div onClick={(e) => { e.stopPropagation(); onToggleFile(); }} className={`cursor-pointer text-[12px] font-black px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow-sm border ${job.isFileUploaded ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-400 border-red-100'}`}>{job.isFileUploaded ? <><FileCheck size={14}/> OK</> : <><FileX size={14}/> NO</>}</div>
         </div>
      </div>
      {job.note && <div className="absolute bottom-[65px] right-2 text-yellow-600 bg-yellow-100 p-1 rounded shadow-sm"><StickyNote size={14}/></div>}
    </div>
  );
}

function SettingsListEditor({ title, items, onSave }) {
   return (
      <div>
         <h3 className="font-bold text-sm text-slate-700 mb-2">{title}</h3>
         <div className="flex flex-wrap gap-2 mb-2">
            {items.map((item, idx) => (
               <div key={idx} className="bg-slate-100 px-2 py-1 rounded border flex items-center gap-2 text-sm">
                  {item}
                  <button onClick={() => { const ni = [...items]; ni.splice(idx,1); onSave(ni); }} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
               </div>
            ))}
         </div>
         <form onSubmit={e => { e.preventDefault(); if(e.target.val.value) { onSave([...items, e.target.val.value]); e.target.reset(); }}} className="flex gap-2">
            <input name="val" className="flex-1 px-3 py-1 border rounded text-sm outline-none focus:border-blue-500" placeholder={`Agregar ${title}...`}/>
            <button className="bg-slate-800 text-white px-3 rounded"><Plus size={16}/></button>
         </form>
      </div>
   );
}

function KanbanColumn({ title, status, count, color, icon, children, onDropJob, isTvMode }) {
  const [isOver, setIsOver] = useState(false);
  const colorMap = { indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700', blue: 'bg-blue-50 border-blue-200 text-blue-700', purple: 'bg-purple-50 border-purple-200 text-purple-700' };
  return (
    <div className={`flex-1 flex flex-col min-w-[280px] max-w-sm h-full rounded-xl overflow-hidden border transition-colors duration-200 ${isOver ? 'bg-slate-300 border-slate-400 shadow-inner' : (isTvMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/50 border-slate-200')}`} onDragOver={e => {e.preventDefault(); setIsOver(true)}} onDragLeave={() => setIsOver(false)} onDrop={e => {e.preventDefault(); setIsOver(false); onDropJob(e, status)}}>
      <div className={`p-3 border-b border-white/50 flex justify-between items-center ${colorMap[color]} bg-opacity-40`}><div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">{icon} {title}</div><span className="bg-white/80 px-2 py-0.5 rounded text-xs font-bold shadow-sm">{count}</span></div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">{children}</div>
    </div>
  );
}