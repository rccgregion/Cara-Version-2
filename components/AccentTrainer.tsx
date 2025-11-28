import React, { useState, useRef, useContext } from 'react';
import { Mic, Square, RefreshCw, Volume2, ArrowRight } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { UserContext } from '../UserContext';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const PHRASES = [
  "I would like to schedule a meeting to discuss the quarterly report.",
  "Could you please clarify the third point on the agenda?",
  "I'm looking forward to collaborating with the engineering team on this project."
];

export default function AccentTrainer() {
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{score: number, feedback: string[]} | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const { addXp } = useContext(UserContext);
  const currentPhrase = PHRASES[currentPhraseIdx];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setResult(null);
    } catch (err) { alert("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsAnalyzing(true);
    }
  };

  const processAudio = async (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      try {
        const analysis = await GeminiService.analyzeAccent(base64Audio, currentPhrase);
        setResult(analysis);
        addXp(analysis.score > 80 ? 50 : 25);
      } catch (err) { console.error(err); } finally { setIsAnalyzing(false); }
    };
  };

  const playReference = () => {
      const utterance = new SpeechSynthesisUtterance(currentPhrase);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto flex flex-col items-center pb-12"
    >
      <motion.div variants={item} className="text-center mb-12">
        <h1 className="text-5xl font-serif font-bold text-stone-900 mb-2">Vocal Studio.</h1>
        <p className="text-stone-500 font-serif italic text-lg">Precision articulation training.</p>
      </motion.div>

      {/* Main Studio Card */}
      <motion.div 
        variants={item}
        className="w-full editorial-card bg-white p-16 text-center min-h-[400px] flex flex-col items-center justify-center relative shadow-2xl mb-12 border-stone-200"
      >
        <span className="absolute top-8 left-8 text-xs font-bold uppercase tracking-widest text-stone-300">Take {currentPhraseIdx + 1}</span>
        
        <p className="text-4xl md:text-5xl font-serif font-bold text-stone-900 leading-tight mb-10 max-w-3xl">
          "{currentPhrase}"
        </p>
        
        <button 
            onClick={playReference}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-teal-700 transition-colors"
        >
            <Volume2 size={16} /> Reference Audio
        </button>

        {isAnalyzing && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-20">
                <RefreshCw className="animate-spin text-stone-900 mb-4" size={32} />
                <p className="font-serif italic text-stone-500">Processing acoustics...</p>
            </div>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div variants={item} className="flex flex-col items-center gap-6 relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 disabled:opacity-50 ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-stone-900 hover:bg-teal-900'}`}
        >
          {isRecording ? <Square size={32} className="text-white fill-current" /> : <Mic size={36} className="text-white" />}
        </button>
        <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{isRecording ? "Recording Live" : "Press to Record"}</p>
      </motion.div>

      {/* Feedback */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 border-t border-stone-200 pt-12"
          >
             <div className="md:col-span-4 text-center md:text-left">
                 <span className="block text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Clarity Score</span>
                 <span className="text-8xl font-serif font-bold text-stone-900">{result.score}</span>
             </div>
             <div className="md:col-span-8">
                 <h3 className="font-serif font-bold text-xl text-stone-900 mb-6">Director's Notes</h3>
                 <ul className="space-y-4">
                    {result.feedback.map((point, idx) => (
                        <li key={idx} className="flex gap-4 items-start text-stone-700">
                            <ArrowRight size={16} className="mt-1.5 text-teal-700 shrink-0" />
                            <span className="font-serif text-lg leading-relaxed">{point}</span>
                        </li>
                    ))}
                 </ul>
                 <div className="mt-8 flex justify-end">
                     <button onClick={() => { setResult(null); setCurrentPhraseIdx(p => (p+1)%PHRASES.length); }} className="bg-white border border-stone-200 hover:border-stone-900 text-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors">
                         Next Take
                     </button>
                 </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}