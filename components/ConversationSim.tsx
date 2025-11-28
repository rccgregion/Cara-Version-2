import React, { useState, useRef, useEffect, useContext } from 'react';
import { Phone, PhoneOff, Mic, MicOff, LayoutGrid, Activity, FileText, User } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { DocumentUtils } from '../services/documentUtils';
import { UserContext } from '../UserContext';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const SCENARIOS = [
  { id: 'intro', title: 'Behavioral Interview', prompt: "You are a hiring manager..." },
  { id: 'salary', title: 'Salary Negotiation', prompt: "You are an HR representative..." },
  { id: 'smalltalk', title: 'Casual Small Talk', prompt: "Engage in casual talk..." },
  { id: 'hard_feedback', title: 'Tough Feedback', prompt: "You are a manager..." }
];

const PERSONAS = [
    { id: 'default', label: 'Neutral Coach' },
    { id: 'skeptic', label: 'The Skeptic' },
    { id: 'ally', label: 'The Ally' },
    { id: 'executive', label: 'The Executive' },
];

export default function ConversationSim() {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [activePersona, setActivePersona] = useState(PERSONAS[0]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [customContext, setCustomContext] = useState<string>('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Audio Scheduling Queue
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const { addXp } = useContext(UserContext);

  useEffect(() => {
    return () => cleanupAudio();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const text = await DocumentUtils.readFile(file);
        setCustomContext(text);
    }
  };

  const cleanupAudio = () => {
    scheduledSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    scheduledSourcesRef.current = [];
    
    if (audioContextRef.current) { 
        audioContextRef.current.close(); 
        audioContextRef.current = null; 
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    sessionRef.current = null;
    setIsConnected(false);
    nextStartTimeRef.current = 0;
  };

  const startCall = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 }); // 16kHz for Gemini Live
      audioContextRef.current = ctx;
      
      // Jitter Buffer Init
      nextStartTimeRef.current = ctx.currentTime + 0.2; 
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = ctx.createMediaStreamSource(stream);
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawVisualizer();

      let sys = activeScenario.prompt;
      if (customContext) sys += `\n\nCONTEXT: ${customContext.substring(0, 5000)}`;

      sessionRef.current = await GeminiService.connectLive(
        ctx, sys, activePersona.id,
        (buf) => {
             // Audio Queue Logic
             const now = ctx.currentTime;
             let start = Math.max(now, nextStartTimeRef.current);
             
             const src = ctx.createBufferSource();
             src.buffer = buf;
             src.connect(ctx.destination);
             src.start(start);
             
             nextStartTimeRef.current = start + buf.duration;
             scheduledSourcesRef.current.push(src);
             
             src.onended = () => {
                const index = scheduledSourcesRef.current.indexOf(src);
                if (index > -1) scheduledSourcesRef.current.splice(index, 1);
             };
        },
        () => { 
            // Interruption Logic
            scheduledSourcesRef.current.forEach(s => s.stop()); 
            scheduledSourcesRef.current = [];
            nextStartTimeRef.current = ctx.currentTime;
        },
        () => cleanupAudio()
      );
      
      setIsConnected(true);

      // AudioWorklet for Performance
      const workletCode = `
        class RecorderProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input && input.length > 0) {
              this.port.postMessage(input[0]);
            }
            return true;
          }
        }
        registerProcessor('recorder-worklet', RecorderProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await ctx.audioWorklet.addModule(workletUrl);
      const workletNode = new AudioWorkletNode(ctx, 'recorder-worklet');
      
      workletNode.port.onmessage = (e) => {
        if (!sessionRef.current) return;
        GeminiService.sendLiveAudioChunk(sessionRef.current, e.data);
      };
      
      source.connect(workletNode);
      workletNode.connect(ctx.destination);

    } catch (err) { 
        console.error("Call Setup Error", err); 
        alert("Could not start call. Please check microphone permissions."); 
        cleanupAudio(); 
    }
  };

  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = isConnected ? '#115e59' : '#d6d3d1'; 
    ctx.lineWidth = 2;
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for(let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height/2;
        if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.stroke();
    animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex flex-col md:flex-row gap-0 border border-stone-200 bg-white shadow-xl overflow-hidden"
    >
      <div className="md:hidden p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
        <span className="font-serif font-bold text-stone-900">Session Config</span>
        <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 border border-stone-300">
            <LayoutGrid size={18} />
        </button>
      </div>

      <motion.div 
        variants={item} 
        className={`${showMobileMenu ? 'block' : 'hidden'} md:block w-full md:w-80 bg-stone-50 border-r border-stone-200 flex flex-col overflow-y-auto md:h-full absolute md:relative z-20 h-auto bottom-0 top-14 md:top-0`}
      >
         <div className="p-6 border-b border-stone-200 hidden md:block">
             <h3 className="font-serif font-bold text-stone-900 text-xl">Boardroom</h3>
             <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">Simulation Setup</p>
         </div>
         
         <div className="p-6 space-y-8">
             <div>
                 <span className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-4">Scenario</span>
                 <div className="space-y-1">
                    {SCENARIOS.map(s => (
                    <button key={s.id} onClick={() => { setActiveScenario(s); setShowMobileMenu(false); }} disabled={isConnected} className={`w-full text-left py-3 px-4 border-l-2 transition-all text-sm font-medium ${activeScenario.id === s.id ? 'border-stone-900 text-stone-900 bg-white shadow-sm' : 'border-transparent text-stone-500 hover:text-stone-800'}`}>
                        {s.title}
                    </button>
                    ))}
                 </div>
             </div>
             
             <div>
                 <span className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-4">Interviewer Persona</span>
                 <div className="grid grid-cols-2 gap-2">
                    {PERSONAS.map(p => (
                    <button key={p.id} onClick={() => setActivePersona(p)} disabled={isConnected} className={`text-center py-2 px-1 text-xs border transition-all ${activePersona.id === p.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400 bg-white'}`}>
                        {p.label}
                    </button>
                    ))}
                 </div>
             </div>

             <div>
                 <span className="text-xs font-bold uppercase tracking-widest text-stone-400 block mb-4">Context</span>
                 {!customContext ? (
                     <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed border-stone-300 py-6 text-stone-400 text-xs font-bold uppercase hover:border-stone-900 hover:text-stone-900 transition-colors bg-white">
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
                         + Upload Resume / JD
                     </button>
                 ) : (
                     <div className="flex items-center gap-2 bg-white border border-stone-200 p-3 text-xs font-bold text-stone-900 shadow-sm">
                         <FileText size={14} className="text-teal-700" /> 
                         <span className="truncate flex-1">Context Loaded</span>
                         <button onClick={() => setCustomContext('')} className="ml-auto text-stone-400 hover:text-rose-500">×</button>
                     </div>
                 )}
             </div>
         </div>
      </motion.div>

      <motion.div variants={item} className="flex-1 flex flex-col relative bg-stone-100">
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12">
              <div className="w-full max-w-3xl aspect-video bg-white border border-stone-200 shadow-2xl flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-8 bg-stone-100 border-b border-stone-200 flex items-center px-4 gap-2 z-10">
                      <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <div className="ml-auto text-[10px] font-mono text-stone-400 uppercase">Live Feed // 24kHz</div>
                  </div>
                  
                  <canvas ref={canvasRef} width={800} height={400} className="w-full h-full opacity-60" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${isConnected ? 'bg-teal-900 text-white border-teal-800/20 shadow-xl scale-110' : 'bg-stone-50 text-stone-300 border-stone-200'}`}>
                          {isConnected ? <Activity size={48} className="animate-pulse" /> : <Phone size={48} strokeWidth={1.5} />}
                      </div>
                      <div className="mt-8 text-center">
                          <p className="font-serif font-bold text-stone-900 text-2xl">
                              {isConnected ? activePersona.label : "Ready to Connect"}
                          </p>
                          <p className="font-sans text-stone-400 text-xs uppercase tracking-widest mt-2">
                              {isConnected ? "Session Active" : activeScenario.title}
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="h-24 bg-white border-t border-stone-200 flex items-center justify-center gap-4 md:gap-8 z-30">
              {!isConnected ? (
                  <button onClick={startCall} className="bg-stone-900 text-white px-8 md:px-12 py-4 font-bold uppercase tracking-widest text-xs hover:bg-teal-900 transition-all active:scale-95 shadow-lg">
                      Initiate Call
                  </button>
              ) : (
                  <>
                      <button onClick={() => setIsMuted(!isMuted)} className={`p-4 border transition-all active:scale-95 ${isMuted ? 'bg-rose-900 text-white border-rose-900' : 'bg-white text-stone-900 border-stone-200 hover:border-stone-900'}`}>
                          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button onClick={() => { cleanupAudio(); addXp(200); }} className="bg-white border border-stone-200 text-rose-600 px-8 md:px-12 py-4 font-bold uppercase tracking-widest text-xs hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95">
                          Terminate
                      </button>
                  </>
              )}
          </div>
      </motion.div>
    </motion.div>
  );
}