
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Briefcase, 
  PenTool, 
  Headphones, 
  Mic2, 
  MessageSquare, 
  Video, 
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import WritingLab from './components/WritingLab';
import JobCenter from './components/JobCenter';
import ListeningLab from './components/ListeningLab';
import AccentTrainer from './components/AccentTrainer';
import ConversationSim from './components/ConversationSim';
import VideoPractice from './components/VideoPractice';
import { UserProfile } from './types';
import { UserContext } from './UserContext';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }
export const ToastContext = createContext({ showToast: (msg: string, type: ToastType) => {} });

const ToastContainer = ({ toasts }: { toasts: Toast[] }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={`px-4 py-3 rounded-md shadow-lg border flex items-center gap-3 min-w-[300px] ${
            t.type === 'success' ? 'bg-stone-900 text-white border-stone-800' :
            t.type === 'error' ? 'bg-white text-rose-600 border-rose-200' : 'bg-white text-stone-900 border-stone-200'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 size={16} className="text-teal-400" />}
          {t.type === 'error' && <AlertCircle size={16} />}
          <span className="text-sm font-medium font-sans">{t.message}</span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const Background = () => (
  <div className="fixed inset-0 -z-10 bg-[#fafaf9]">
    <div className="absolute inset-0 bg-grain opacity-50" />
    <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-gradient-to-bl from-indigo-100/30 to-transparent blur-[120px]" />
    <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-gradient-to-tr from-teal-100/30 to-transparent blur-[120px]" />
  </div>
);

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link to={to} className={`group flex items-center gap-4 px-4 py-3 transition-all duration-300 border-l-2 ${active ? 'border-teal-800 text-teal-900 bg-stone-100' : 'border-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-50'}`}>
    <Icon size={20} className={active ? "text-teal-800" : "text-stone-400 group-hover:text-stone-700"} strokeWidth={1.5} />
    <span className={`text-sm tracking-wide ${active ? 'font-serif font-semibold italic' : 'font-sans font-medium'}`}>{label}</span>
    {active && <ChevronRight size={14} className="ml-auto text-teal-800/50" />}
  </Link>
);

const ApiKeyModal = ({ onComplete }: { onComplete: () => void }) => {
    const [key, setKey] = useState('');
    const handleSubmit = () => {
        if (key) {
            sessionStorage.setItem('cara_api_key', key);
            onComplete();
        }
    };
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/90 backdrop-blur-sm p-4">
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white max-w-md w-full p-10 shadow-2xl border border-stone-200"
            >
                <div className="mb-8">
                    <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Access Required</h2>
                    <p className="text-stone-500 font-sans text-sm leading-relaxed">This professional tool requires a valid Google Gemini API key. Stored locally for session only.</p>
                </div>
                <div className="space-y-6">
                    <input 
                        type="password" 
                        value={key} 
                        onChange={(e) => setKey(e.target.value)} 
                        className="input-editorial"
                        placeholder="Paste API Key..."
                        autoFocus
                    />
                    <button onClick={handleSubmit} disabled={!key} className="w-full bg-stone-900 text-stone-50 py-4 font-sans font-medium text-sm tracking-widest uppercase hover:bg-stone-800 disabled:opacity-50 transition-colors">Enter Studio</button>
                </div>
            </motion.div>
        </div>
    );
};

const ROLES = [
  "Product Manager", "Software Engineer", "Data Scientist", "Marketing Executive",
  "Registered Nurse", "Project Manager", "Financial Analyst", "UX Designer",
  "Sales Representative", "HR Specialist", "Business Consultant"
];

const OnboardingWizard = ({ onComplete }: { onComplete: (data: Partial<UserProfile>) => void }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [filteredRoles, setFilteredRoles] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isValidName = name.length >= 2 && /^[a-zA-Z\s]*$/.test(name);
  const isValidRole = role.length >= 3;

  const handleRoleChange = (val: string) => {
    setRole(val);
    if (val.length > 0) {
      const match = ROLES.filter(r => r.toLowerCase().includes(val.toLowerCase()));
      setFilteredRoles(match);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectRole = (r: string) => {
    setRole(r);
    setShowSuggestions(false);
  };

  const handleNext = () => {
    if (step === 0 && isValidName) setStep(1);
    else if (step === 1 && isValidRole) {
      onComplete({ name, role, hasOnboarded: true });
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          if (step === 0 && isValidName) handleNext();
          if (step === 1 && isValidRole) handleNext();
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-100 p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl w-full">
        <h1 className="text-6xl font-serif font-bold text-stone-900 mb-4">Cara.</h1>
        
        {step === 0 ? (
          <div className="space-y-8">
            <div>
                <p className="text-xl text-stone-500 font-light mb-2">Who shall we address you as?</p>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-transparent text-4xl font-serif text-stone-900 border-b-2 outline-none pb-4 placeholder-stone-300 transition-colors ${name && !isValidName ? 'border-rose-300' : 'border-stone-300 focus:border-stone-900'}`}
                  placeholder="Your Name"
                  autoFocus
                />
                {!isValidName && name.length > 0 && <p className="text-rose-500 text-xs mt-2">Please enter a valid name (letters only, 2+ chars).</p>}
            </div>
            <div className="flex justify-end">
                <button onClick={handleNext} disabled={!isValidName} className="text-stone-900 font-bold border-b border-stone-900 pb-1 hover:opacity-70 disabled:opacity-30">Next →</button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="relative">
                <p className="text-xl text-stone-500 font-light mb-2">What is your professional target?</p>
                <input 
                  type="text" 
                  value={role} 
                  onChange={(e) => handleRoleChange(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => role && setShowSuggestions(true)}
                  className="w-full bg-transparent text-4xl font-serif text-stone-900 border-b-2 border-stone-300 focus:border-stone-900 outline-none pb-4 placeholder-stone-300"
                  placeholder="e.g. Product Manager"
                  autoFocus
                />
                {showSuggestions && filteredRoles.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-stone-200 shadow-xl max-h-48 overflow-y-auto z-10">
                    {filteredRoles.map(r => (
                      <div key={r} onClick={() => selectRole(r)} className="px-4 py-3 hover:bg-teal-50 cursor-pointer font-serif text-lg text-stone-700">
                        {r}
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <div className="flex justify-end">
                <button onClick={handleNext} disabled={!isValidRole} className="text-stone-900 font-bold border-b border-stone-900 pb-1 hover:opacity-70 disabled:opacity-30">Begin Journey →</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="h-full flex flex-col"
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/writing" element={<PageTransition><WritingLab /></PageTransition>} />
        <Route path="/jobs" element={<PageTransition><JobCenter /></PageTransition>} />
        <Route path="/listening" element={<PageTransition><ListeningLab /></PageTransition>} />
        <Route path="/accent" element={<PageTransition><AccentTrainer /></PageTransition>} />
        <Route path="/conversation" element={<PageTransition><ConversationSim /></PageTransition>} />
        <Route path="/video" element={<PageTransition><VideoPractice /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useContext(UserContext);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Overview' },
    { path: '/conversation', icon: MessageSquare, label: 'Live Simulation' },
    { path: '/writing', icon: PenTool, label: 'Writing Studio' },
    { path: '/accent', icon: Mic2, label: 'Vocal Coach' },
    { path: '/video', icon: Video, label: 'Video Analysis' },
    { path: '/jobs', icon: Briefcase, label: 'Opportunities' },
    { path: '/listening', icon: Headphones, label: 'Listening Lab' },
  ];

  return (
    <div className="flex h-screen text-stone-900 overflow-hidden font-sans bg-[#fafaf9]">
      <Background />
      <aside className={`fixed md:relative inset-y-0 left-0 w-72 bg-[#fafaf9] border-r border-stone-200 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 flex flex-col h-full`}>
        <div className="p-8 pb-4">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-stone-900">Cara.</h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-medium">Professional Suite</p>
        </div>
        <div className="flex-1 py-6 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <SidebarItem key={item.path} to={item.path} icon={item.icon} label={item.label} active={location.pathname === item.path} />
          ))}
        </div>
        <div className="p-6 border-t border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-stone-200 rounded-full overflow-hidden shrink-0 border border-stone-300 flex items-center justify-center">
              <User size={20} className="text-stone-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-stone-900 truncate">{user.name}</p>
              <p className="text-xs text-stone-500 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-stone-900/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-stone-200 bg-[#fafaf9]/80 backdrop-blur-md sticky top-0 z-20">
          <span className="font-serif font-bold text-xl">Cara.</span>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- User Provider Component ---
const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('cara_user');
    return saved ? JSON.parse(saved) : {
      name: "Guest",
      role: "Professional",
      level: 1,
      xp: 0,
      streak: 0,
      dailyGoal: false,
      hasOnboarded: false
    };
  });

  useEffect(() => {
    localStorage.setItem('cara_user', JSON.stringify(user));
  }, [user]);

  const addXp = (amount: number) => {
    setUser(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.floor(newXp / 1000) + 1;
      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const completeTask = (task: string) => {
      // Logic for tracking tasks
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <UserContext.Provider value={{ user, addXp, completeTask, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

const App = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasApiKey, setHasApiKey] = useState(!!process.env.API_KEY || !!sessionStorage.getItem('cara_api_key'));

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleApiKeyComplete = () => {
      setHasApiKey(true);
  };

  return (
    <UserProvider>
      <ToastContext.Provider value={{ showToast }}>
        <HashRouter>
          <div className="antialiased text-stone-900 bg-[#fafaf9]">
            <ToastContainer toasts={toasts} />
            
            {!hasApiKey ? (
                <ApiKeyModal onComplete={handleApiKeyComplete} />
            ) : (
                <UserContext.Consumer>
                    {({ user, updateProfile }) => (
                        !user.hasOnboarded ? (
                            <OnboardingWizard onComplete={updateProfile} />
                        ) : (
                            <Layout>
                                <AnimatedRoutes />
                            </Layout>
                        )
                    )}
                </UserContext.Consumer>
            )}
          </div>
        </HashRouter>
      </ToastContext.Provider>
    </UserProvider>
  );
};

export default App;
