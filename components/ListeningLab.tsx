import React, { useState, useRef, useContext, useEffect } from 'react';
import { Play, Pause, Volume2, ListMusic, Headphones, Disc, BookOpen, Clock, Settings, FastForward } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { UserContext } from '../UserContext';
import { ListeningScenario } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

// Extended Type for Vocabulary
interface EnhancedScenario extends ListeningScenario {
    context?: string;
    vocabulary?: { term: string; definition: string }[];
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ListeningLab() {
  const [scenario, setScenario] = useState<EnhancedScenario | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answers, setAnswers] = useState<{[key: number]: number}>({});
  const [showResults, setShowResults] = useState(false);
  const [topic, setTopic] = useState('Office Standup Meeting');
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showLinerNotes, setShowLinerNotes] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const { addXp } = useContext(UserContext);

  useEffect(() => {
    return () => {
        if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch(e){}
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  };

  const generateNewScenario = async () => {
    setIsLoading(true);
    setScenario(null);
    setAudioBuffer(null);
    setAnswers({});
    setShowResults(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    pauseTimeRef.current = 0;
    setShowLinerNotes(false);

    try {
      const content = await GeminiService.generateListeningScenario(topic, 'Intermediate');
      setScenario(content as EnhancedScenario);
      
      const voices = ['Kore', 'Fenrir', 'Puck', 'Zephyr', 'Charon'];
      const audioBase64 = await GeminiService.generateSpeech(content.transcript, voices[Math.floor(Math.random() * voices.length)]);
      
      if (audioBase64) {
        const ctx = getAudioContext();
        const buffer = await GeminiService.decodeAudio(audioBase64, ctx);
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
      }
    } catch (err) { 
        alert("Generation failed. Please try again."); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const toggleAudio = async () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    if (isPlaying) {
      if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current = null;
      }
      pauseTimeRef.current += (ctx.currentTime - startTimeRef.current) * playbackRate;
      setIsPlaying(false);
    } else {
      if (!audioBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);
      
      startTimeRef.current = ctx.currentTime;
      if (pauseTimeRef.current >= audioBuffer.duration) pauseTimeRef.current = 0;
      const offset = pauseTimeRef.current % audioBuffer.duration; // This is the 'time in buffer'
      
      source.start(0, offset);
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const updateProgress = () => {
          if (!sourceNodeRef.current || !isPlaying) return;
          
          // Calculate elapsed time taking playback rate into account
          const elapsedRealTime = ctx.currentTime - startTimeRef.current;
          const elapsedAudioTime = elapsedRealTime * playbackRate;
          const current = offset + elapsedAudioTime;

          setCurrentTime(Math.min(current, audioBuffer.duration));
          const pct = Math.min(100, (current / audioBuffer.duration) * 100);
          setProgress(pct);
          
          if (current < audioBuffer.duration) {
              requestAnimationFrame(updateProgress);
          } else {
              setIsPlaying(false);
              setProgress(100);
              setCurrentTime(audioBuffer.duration);
              pauseTimeRef.current = 0;
          }
      };
      requestAnimationFrame(updateProgress);
    }
  };

  const changePlaybackRate = (rate: number) => {
      setPlaybackRate(rate);
      if (isPlaying && sourceNodeRef.current) {
          // Live update of playback rate
          sourceNodeRef.current.playbackRate.value = rate;
          // We need to reset start times to handle progress calculation accurately
          // But for simple implementation, a pause/resume glitch might occur or progress calculation might drift.
          // For absolute precision, we'd stop and restart.
          // Let's do a quick restart to keep sync logic simple.
          const ctx = getAudioContext();
          sourceNodeRef.current.stop();
          pauseTimeRef.current += (ctx.currentTime - startTimeRef.current) * (sourceNodeRef.current.playbackRate.value); // Use OLD rate for calc
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = rate;
          source.connect(ctx.destination);
          startTimeRef.current = ctx.currentTime;
          const offset = pauseTimeRef.current;
          source.start(0, offset);
          sourceNodeRef.current = source;
      }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioBuffer) return;
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const seekTime = pct * audioBuffer.duration;
      
      pauseTimeRef.current = seekTime;
      setProgress(pct * 100);
      setCurrentTime(seekTime);
      
      if (isPlaying) {
          const ctx = getAudioContext();
          if (sourceNodeRef.current) {
              sourceNodeRef.current.stop();
          }
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRate;
          source.connect(ctx.destination);
          startTimeRef.current = ctx.currentTime;
          source.start(0, seekTime);
          sourceNodeRef.current = source;
      }
  };

  const handleAnswer = (qId: number, optionIdx: number) => setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  
  const checkAnswers = () => {
    if (!scenario) return;
    setShowResults(true);
    addXp(100);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-stone-200 pb-6 mb-8 gap-4">
        <div>
            <h2 className="text-4xl font-serif font-bold text-stone-900 mb-2">Listening Lab.</h2>
            <p className="text-stone-500 font-serif italic">Tune your ear to the nuances.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:flex-none">
                 <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-transparent border-b border-stone-300 font-serif text-stone-900 py-2 focus:border-stone-900 outline-none appearance-none pr-8 cursor-pointer hover:bg-stone-50">
                     <option>Office Standup Meeting</option>
                     <option>Client Negotiation Call</option>
                     <option>Tech Support Troubleshooting</option>
                     <option>Performance Review Feedback</option>
                     <option>Project Post-Mortem (Blameless)</option>
                     <option>Watercooler Small Talk</option>
                     <option>Networking Event Introduction</option>
                     <option>Salary Negotiation Follow-up</option>
                     <option>Giving a Technical Presentation</option>
                     <option>Handling a Customer Complaint</option>
                 </select>
                 <div className="absolute right-0 top-3 pointer-events-none text-stone-400 text-xs">▼</div>
             </div>
             <button onClick={generateNewScenario} disabled={isLoading} className="text-xs font-bold uppercase tracking-widest text-stone-900 border border-stone-900 px-6 py-2 hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap">
                {isLoading ? "Generating..." : "New Track"}
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <motion.div variants={item} className="lg:col-span-4">
            <div className="editorial-card bg-stone-900 text-stone-50 aspect-[4/5] p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                 
                 <div className="relative z-10 flex justify-between items-start">
                     <div className="flex gap-2">
                        <div className="w-12 h-12 border border-stone-700 rounded-full flex items-center justify-center">
                            <Headphones size={20} className="text-stone-400" />
                        </div>
                        {scenario?.context && (
                             <div className="flex items-center px-3 border border-stone-700 rounded-full text-[10px] font-mono text-teal-400 uppercase tracking-wider bg-stone-900/50 backdrop-blur-sm">
                                {scenario.context}
                             </div>
                        )}
                     </div>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 border border-stone-700 px-2 py-1 rounded-sm">Side A</span>
                 </div>
                 
                 <div className="relative z-10 flex justify-center py-8">
                     <motion.div 
                        animate={{ rotate: isPlaying ? 360 : 0 }} 
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="w-48 h-48 rounded-full border-[8px] border-stone-800 bg-stone-950 flex items-center justify-center shadow-lg relative"
                     >
                         <Disc size={180} className="text-stone-800 absolute opacity-50" />
                         <div className="w-16 h-16 bg-teal-800 rounded-full flex items-center justify-center overflow-hidden">
                             <div className="w-2 h-2 bg-black rounded-full"></div>
                         </div>
                     </motion.div>
                 </div>

                 <div className="relative z-10">
                     <h3 className="text-2xl font-serif font-bold text-white mb-1 leading-tight line-clamp-1">
                         {scenario ? scenario.title : "Select Topic"}
                     </h3>
                     
                     {/* Playback Speed Controls */}
                     <div className="flex items-center gap-2 mb-4 justify-center">
                        {[0.75, 1.0, 1.25, 1.5].map(rate => (
                            <button 
                                key={rate} 
                                onClick={() => changePlaybackRate(rate)}
                                disabled={!audioBuffer}
                                className={`text-[10px] font-mono px-2 py-1 border transition-colors ${playbackRate === rate ? 'bg-teal-700 border-teal-700 text-white' : 'border-stone-700 text-stone-500 hover:text-white'}`}
                            >
                                {rate}x
                            </button>
                        ))}
                     </div>

                     <div className="w-full h-1 bg-stone-800 mb-2 relative cursor-pointer group" onClick={handleSeek}>
                         <div className="absolute top-0 left-0 h-full bg-teal-500 transition-all duration-100" style={{ width: `${progress}%` }}></div>
                         <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `${progress}%` }}></div>
                     </div>
                     <div className="flex justify-between text-[10px] font-mono text-stone-500 mb-6">
                         <span>{formatTime(currentTime)}</span>
                         <span>{formatTime(duration)}</span>
                     </div>

                     <div className="flex justify-center">
                         <button 
                            onClick={toggleAudio} 
                            disabled={!audioBuffer} 
                            className="w-16 h-16 bg-stone-50 text-stone-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
                         >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                         </button>
                     </div>
                 </div>
            </div>
            
            {/* Liner Notes Toggle */}
            {scenario?.vocabulary && (
                <div className="mt-4 flex justify-center">
                    <button 
                        onClick={() => setShowLinerNotes(!showLinerNotes)}
                        className="text-stone-400 text-xs uppercase tracking-widest hover:text-stone-900 flex items-center gap-2 transition-colors"
                    >
                        <BookOpen size={14} /> {showLinerNotes ? "Hide Liner Notes" : "View Vocabulary"}
                    </button>
                </div>
            )}
        </motion.div>

        <motion.div variants={item} className="lg:col-span-8 space-y-8">
            {!scenario ? (
                <div className="h-full flex flex-col items-center justify-center border border-dashed border-stone-300 p-12 text-stone-400 bg-stone-50">
                    <ListMusic size={48} strokeWidth={1} className="mb-4" />
                    <p className="font-serif italic">Playlist empty.</p>
                </div>
            ) : (
                <>
                   {/* Liner Notes Section */}
                   <AnimatePresence>
                       {showLinerNotes && (
                           <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                           >
                               <div className="bg-stone-100 border border-stone-200 p-6 mb-8">
                                   <h4 className="font-serif font-bold text-lg text-stone-900 mb-4 flex items-center gap-2">
                                       <Disc className="text-teal-700" size={18} /> Liner Notes
                                   </h4>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       {scenario.vocabulary?.map((vocab, i) => (
                                           <div key={i} className="bg-white p-4 border border-stone-200 shadow-sm">
                                               <p className="font-bold text-stone-900 text-sm mb-1">{vocab.term}</p>
                                               <p className="text-xs text-stone-600 italic leading-relaxed">{vocab.definition}</p>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           </motion.div>
                       )}
                   </AnimatePresence>

                   <div className="editorial-card p-0 bg-white border border-stone-200">
                       <details className="group">
                           <summary className="p-6 font-bold text-xs uppercase tracking-widest text-stone-500 cursor-pointer flex items-center justify-between hover:bg-stone-50 transition-colors">
                               <span><Volume2 size={14} className="inline mr-2" /> Transcript</span>
                               <span className="text-stone-300 group-open:rotate-180 transition-transform">▼</span>
                           </summary>
                           <div className="p-6 pt-0 font-serif text-lg leading-relaxed text-stone-800 border-t border-stone-100">
                               {scenario.transcript}
                           </div>
                       </details>
                   </div>

                   <div className="space-y-8">
                       <h4 className="font-serif font-bold text-2xl text-stone-900 border-b border-stone-200 pb-2">Comprehension Check</h4>
                       {scenario.questions.map((q, idx) => (
                           <div key={q.id} className="space-y-4">
                               <p className="font-bold text-stone-800 text-lg font-serif"><span className="text-teal-800 mr-2">{idx + 1}.</span> {q.question}</p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-6">
                                   {q.options.map((opt, oIdx) => {
                                       const isSelected = answers[q.id] === oIdx;
                                       const isCorrect = showResults && q.correctAnswer === oIdx;
                                       const isWrong = showResults && isSelected && q.correctAnswer !== oIdx;
                                       return (
                                           <button
                                              key={oIdx}
                                              disabled={showResults}
                                              onClick={() => handleAnswer(q.id, oIdx)}
                                              className={`text-left px-4 py-3 border transition-all text-sm font-medium ${
                                                  showResults 
                                                  ? isCorrect ? "bg-teal-50 border-teal-500 text-teal-900" 
                                                  : isWrong ? "bg-rose-50 border-rose-500 text-rose-900" : "opacity-50 border-stone-200"
                                                  : isSelected ? "bg-stone-900 text-white border-stone-900 shadow-md" : "bg-white border-stone-200 hover:border-stone-400 hover:bg-stone-50"
                                              }`}
                                           >
                                               {opt}
                                           </button>
                                       )
                                   })}
                               </div>
                           </div>
                       ))}
                   </div>

                   <div className="pt-8 border-t border-stone-200 flex justify-end">
                       {!showResults ? (
                           <button onClick={checkAnswers} disabled={Object.keys(answers).length !== scenario.questions.length} className="bg-stone-900 text-white px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-teal-900 transition-colors disabled:opacity-50 shadow-lg">Submit Assessment</button>
                       ) : (
                           <button onClick={generateNewScenario} className="bg-white border border-stone-900 text-stone-900 px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-colors shadow-lg">Next Track</button>
                       )}
                   </div>
                </>
            )}
        </motion.div>
      </div>
    </motion.div>
  );
}