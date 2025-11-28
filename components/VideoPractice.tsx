import React, { useRef, useState, useEffect, useContext } from 'react';
import { Camera, StopCircle, RotateCcw, Activity, Clapperboard, Film } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { UserContext } from '../UserContext';
import { motion } from 'framer-motion';

export default function VideoPractice() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<string[]>([]);
  const frameIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const [transcript, setTranscript] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const { addXp } = useContext(UserContext);

  useEffect(() => {
    return () => {
      stopAllTracks();
    };
  }, []);

  const stopAllTracks = () => {
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
  };

  useEffect(() => {
    if (isCameraOn && stream && videoRef.current && !recordedBlob) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(console.error);
    }
  }, [isCameraOn, stream, recordedBlob]);

  const startCamera = async () => {
    try {
      stopAllTracks();
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setIsCameraOn(true);
      setRecordedBlob(null);
      setAnalysis(null);
      framesRef.current = [];
      setTranscript('');
      
      if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.onresult = (e: any) => {
           let final = '';
           for (let i = e.resultIndex; i < e.results.length; ++i) {
               if (e.results[i].isFinal) final += e.results[i][0].transcript;
           }
           if (final) setTranscript(p => p + ' ' + final);
        };
      }
    } catch (err) { alert("Camera access denied. Please check permissions."); }
  };

  const captureFrame = () => {
      if (!videoRef.current) return;
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
  };

  const startRecording = () => {
      if (!stream) return;
      chunksRef.current = []; 
      framesRef.current = []; 
      setTranscript('');
      
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          setRecordedBlob(blob);
          setIsCameraOn(false);
          stopAllTracks();
          analyzeSession();
      };
      
      recorder.start();
      if (recognitionRef.current) try { recognitionRef.current.start(); } catch(e){}
      
      setIsRecording(true);
      mediaRecorderRef.current = recorder;
      
      frameIntervalRef.current = window.setInterval(() => {
          const frame = captureFrame();
          if (frame) framesRef.current.push(frame);
      }, 2000);
  };

  const stopRecording = () => { 
      if (mediaRecorderRef.current && isRecording) { 
          mediaRecorderRef.current.stop(); 
          setIsRecording(false); 
      } 
  };

  const analyzeSession = async () => {
      if (framesRef.current.length === 0) return;
      setLoading(true);
      try {
          const result = await GeminiService.analyzeVideoSession(framesRef.current, transcript, "Tell me about yourself.");
          setAnalysis(result);
          addXp(200);
      } catch (e) { 
          setAnalysis({ error: "Processing failed." }); 
      } finally { 
          setLoading(false); 
      }
  };

  const renderAnalysisValue = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return <ul className="list-disc pl-4">{val.map((v, i) => <li key={i}>{String(v)}</li>)}</ul>;
    if (typeof val === 'object') return (
        <ul className="list-disc pl-4 space-y-1">
            {Object.entries(val).map(([k, v]: [string, any]) => (
                <li key={k}><strong className="capitalize">{k}:</strong> {String(v)}</li>
            ))}
        </ul>
    );
    return String(val);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex flex-col gap-6 pb-6">
      <div className="flex justify-between items-end border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-4xl font-serif font-bold text-stone-900">Director's Mode.</h2>
            <p className="text-stone-500 font-serif italic">Non-verbal performance analysis.</p>
          </div>
          {recordedBlob && (
              <button onClick={() => { setRecordedBlob(null); setAnalysis(null); startCamera(); }} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-900 border border-stone-900 px-4 py-2 hover:bg-stone-900 hover:text-white transition-colors">
                  <RotateCcw size={14} /> New Take
              </button>
          )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
         {/* Video Monitor */}
         <div className="flex-1 bg-stone-900 relative flex items-center justify-center overflow-hidden shadow-2xl border border-stone-800 rounded-sm">
            {!isCameraOn && !recordedBlob ? (
                <div className="text-center">
                    <Clapperboard size={64} className="text-stone-700 mx-auto mb-6" strokeWidth={1} />
                    <button onClick={startCamera} className="bg-stone-50 text-stone-900 px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-teal-600 hover:text-white transition-colors">
                        Activate Camera
                    </button>
                </div>
            ) : recordedBlob ? (
                <div className="w-full h-full relative group">
                    <video 
                        ref={recordedVideoRef} 
                        src={URL.createObjectURL(recordedBlob)} 
                        className="w-full h-full object-contain" 
                        controls={true}
                    />
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100 opacity-90" />
                    <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
                        {isRecording ? (
                            <button onClick={stopRecording} className="bg-rose-600 text-white w-16 h-16 rounded-full flex items-center justify-center hover:bg-rose-700 transition-colors animate-pulse shadow-lg ring-4 ring-rose-900/50">
                                <StopCircle size={24} fill="currentColor" />
                            </button>
                        ) : (
                            <button onClick={startRecording} className="bg-white text-stone-900 px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-teal-500 hover:text-white transition-colors shadow-lg">
                                Action
                            </button>
                        )}
                    </div>
                    <div className="absolute top-6 right-6 flex gap-2 items-center bg-black/50 px-3 py-1 rounded-sm backdrop-blur-sm">
                        <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-stone-500'}`} />
                        <span className="text-[10px] font-mono text-white uppercase tracking-wider">{isRecording ? "REC" : "STBY"}</span>
                    </div>
                </>
            )}
         </div>

         {/* Script/Analysis Panel */}
         <div className="lg:w-[400px] bg-white border border-stone-200 p-8 overflow-y-auto font-mono text-sm leading-relaxed shadow-sm">
             <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
                 <h3 className="font-bold text-stone-900 uppercase tracking-widest flex items-center gap-2">
                     <Film size={16} /> Analysis Log
                 </h3>
                 {loading && <Activity size={16} className="text-teal-600 animate-spin" />}
             </div>
             
             {loading ? (
                 <div className="space-y-4 opacity-50">
                     <div className="h-4 bg-stone-100 rounded w-3/4 animate-pulse"></div>
                     <div className="h-4 bg-stone-100 rounded w-1/2 animate-pulse"></div>
                     <p className="text-stone-400 text-xs pt-4 text-center">AI Director is reviewing footage...</p>
                 </div>
             ) : analysis ? (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-stone-50 p-4 border-l-2 border-teal-800">
                         <span className="block text-stone-400 text-[10px] uppercase mb-1 font-bold">Confidence Arc</span>
                         <div className="text-stone-800 text-xs leading-relaxed">{renderAnalysisValue(analysis["Confidence Evolution"] || analysis["confidence"])}</div>
                     </div>
                     <div className="bg-stone-50 p-4 border-l-2 border-amber-600">
                         <span className="block text-stone-400 text-[10px] uppercase mb-1 font-bold">Visual Cues</span>
                         <div className="text-stone-800 text-xs leading-relaxed">{renderAnalysisValue(analysis["Non-Verbal Cues"] || analysis["nonVerbal"])}</div>
                     </div>
                     <div className="bg-stone-50 p-4 border-l-2 border-stone-600">
                         <span className="block text-stone-400 text-[10px] uppercase mb-1 font-bold">Consistency Check</span>
                         <div className="text-stone-800 text-xs leading-relaxed">{renderAnalysisValue(analysis["Consistency"] || analysis["consistency"])}</div>
                     </div>
                 </div>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-stone-300">
                     <p className="italic text-center">"Scene is empty.<br/>Waiting for playback."</p>
                 </div>
             )}
         </div>
      </div>
    </motion.div>
  );
}