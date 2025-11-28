import React, { useState, useContext, useRef, useEffect } from 'react';
import { Send, RefreshCw, Copy, Search, Upload, Globe, Layers, AlertCircle, MonitorPlay, Lightbulb, Check, FileText } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { DocumentUtils } from '../services/documentUtils';
import { UserContext } from '../UserContext';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

type Mode = 'optimizer' | 'ats' | 'bio' | 'cultural' | 'gap' | 'presentation';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const ResumeSection = ({ title, children, copyText, className = "" }: { title: string, children: React.ReactNode, copyText: string, className?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`relative group mb-6 ${className}`}>
      <div className="flex items-center justify-between border-b border-stone-300 pb-1 mb-3">
        {title && <h3 className="font-serif font-bold text-stone-900 uppercase tracking-widest text-xs">{title}</h3>}
        <button 
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-teal-700 p-1 absolute right-0 top-0"
          title="Copy section"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="text-stone-700 font-serif text-sm leading-relaxed w-full">
        {children}
      </div>
    </div>
  );
};

export default function WritingLab() {
  const [mode, setMode] = useState<Mode>('optimizer');
  const [input, setInput] = useState('');
  const [contextInput, setContextInput] = useState(''); 
  const [output, setOutput] = useState('');
  
  const [atsResult, setAtsResult] = useState<any>(null);
  const [optimizedResume, setOptimizedResume] = useState<any>(null);
  const [culturalResult, setCulturalResult] = useState<any>(null);
  const [gapResult, setGapResult] = useState<any>(null);
  const [presentationResult, setPresentationResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<{name: string, size: number} | null>(null);
  const [intensity, setIntensity] = useState<'strict' | 'creative'>('strict');
  
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('LinkedIn');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addXp } = useContext(UserContext);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.jobDescription) {
        setContextInput(location.state.jobDescription);
        setMode('optimizer');
    }
  }, [location.state]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        const text = await DocumentUtils.readFile(file);
        setInput(text);
        setUploadedFile({ name: file.name, size: file.size });
      } catch (err) {
        alert("Error reading file.");
      } finally {
        setLoading(false);
      }
    }
  };

  const resetResults = () => {
    setOutput('');
    setAtsResult(null);
    setOptimizedResume(null);
    setCulturalResult(null);
    setGapResult(null);
    setPresentationResult(null);
  }

  const handleAction = async () => {
    if (!input.trim()) return;
    setLoading(true);
    resetResults();

    try {
      if (mode === 'optimizer') {
        const result = await GeminiService.optimizeResumeJSON(input, contextInput || "General Role", intensity);
        setOptimizedResume(result);
        addXp(100);
      } else if (mode === 'ats') {
        const result = await GeminiService.analyzeATS(input, contextInput);
        setAtsResult(result);
        addXp(50);
      } else if (mode === 'bio') {
        const result = await GeminiService.generateBio(input, platform);
        setOutput(result);
        addXp(25);
      } else if (mode === 'cultural') {
        const result = await GeminiService.culturalTranslate(input);
        setCulturalResult(result);
        addXp(40);
      } else if (mode === 'gap') {
        const result = await GeminiService.gapAnalysis(input, contextInput);
        setGapResult(result);
        addXp(75);
      } else if (mode === 'presentation') {
        const result = await GeminiService.analyzePresentation(input);
        setPresentationResult(result);
        addXp(60);
      }
    } catch (err) {
      console.error(err);
      setOutput("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'optimizer', label: 'Resume', icon: RefreshCw },
    { id: 'ats', label: 'ATS Check', icon: Search },
    { id: 'gap', label: 'Gap Analysis', icon: Layers },
    { id: 'presentation', label: 'Presentation', icon: MonitorPlay },
    { id: 'cultural', label: 'Decoder', icon: Globe },
    { id: 'bio', label: 'Bio Writer', icon: FileText },
  ];

  const formatContactInfo = (info: any) => {
    if (!info) return "";
    if (typeof info === 'string') return info;
    if (typeof info === 'object') return Object.values(info).filter(Boolean).join(' | ');
    return String(info);
  };

  const formatExperienceForCopy = (exp: any[]) => {
    if (!exp) return "";
    return exp.map((job: any) => `${job.role} | ${job.company}\n${job.dates}\n${Array.isArray(job.bullets) ? job.bullets.map((b: string) => `• ${b}`).join('\n') : job.bullets}`).join('\n\n');
  };

  const formatEducationForCopy = (edu: any[]) => {
    if (!edu) return "";
    return edu.map((e: any) => `${e.degree}\n${e.school}, ${e.year}`).join('\n\n');
  };

  const formatSkillsForCopy = (skills: any) => {
      if (!skills) return "";
      if (typeof skills === 'string') return skills;
      if (Array.isArray(skills)) return skills.join(', ');
      if (typeof skills === 'object') {
          return Object.entries(skills)
              .map(([k, v]) => `${k.toUpperCase()}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
              .join('\n');
      }
      return "";
  };

  const renderSkills = (skills: any) => {
      if (!skills) return null;
      if (Array.isArray(skills)) {
          return skills.map((skill, i) => (
              <span key={i} className="block w-full border-b border-stone-100 pb-1 mb-1">{skill}</span>
          ));
      }
      // Handle structured skills (Error #31 Fix)
      if (typeof skills === 'object') {
          return Object.entries(skills).map(([category, items], idx) => (
              <div key={idx} className="mb-4 break-inside-avoid w-full">
                   <h5 className="font-bold text-stone-400 text-[10px] uppercase tracking-widest mb-2 border-b border-stone-100 pb-1">{category}</h5>
                   <div className="flex flex-wrap gap-2">
                       {Array.isArray(items) ? items.map((skill: string, i: number) => (
                           <span key={i} className="text-stone-700 bg-stone-50 px-2 py-1 text-xs rounded-sm border border-stone-100">{skill}</span>
                       )) : <span className="text-stone-700 text-xs">{String(items)}</span>}
                   </div>
              </div>
          ));
      }
      return <span className="block w-full">{String(skills)}</span>;
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="h-[calc(100vh-6rem)] flex flex-col gap-6 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-stone-200 pb-4 flex-shrink-0">
        <div>
          <h2 className="text-4xl font-serif font-bold text-stone-900 leading-none">Writing Studio.</h2>
          <p className="text-stone-500 font-serif italic mt-1">Refine your professional narrative.</p>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {tabs.map((t) => (
            <button 
              key={t.id}
              onClick={() => { setMode(t.id as Mode); resetResults(); }}
              className={`pb-2 text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap ${mode === t.id ? 'text-teal-800 border-b-2 border-teal-800' : 'text-stone-400 hover:text-stone-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        <motion.div variants={item} className="lg:w-1/3 flex flex-col h-full min-h-0">
          <div className="editorial-card rounded-none h-full flex flex-col p-6 bg-stone-50">
             <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Source Material</span>
                {mode !== 'cultural' && (
                  <div>
                     <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileUpload}/>
                     <button onClick={() => fileInputRef.current?.click()} className="text-xs flex items-center gap-2 text-stone-600 hover:text-stone-900 uppercase font-bold tracking-wider">
                       <Upload size={12} /> Upload File
                     </button>
                  </div>
                )}
             </div>

             {uploadedFile ? (
                 <div className="bg-white border border-stone-200 p-4 mb-4 shadow-sm flex items-center justify-between">
                     <div>
                         <p className="text-sm font-bold text-stone-800 truncate max-w-[150px]">{uploadedFile.name}</p>
                         <p className="text-xs text-stone-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                     </div>
                     <button onClick={() => { setInput(''); setUploadedFile(null); }} className="text-stone-400 hover:text-rose-500 text-xs uppercase tracking-widest font-bold">Remove</button>
                 </div>
             ) : (
                <textarea
                    className="flex-1 input-editorial resize-none text-sm leading-loose bg-transparent border-0 focus:ring-0 px-0"
                    placeholder={mode === 'cultural' ? "e.g. 'I will try my best to deliver it'" : "Paste text or upload content..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
             )}

             {(mode === 'optimizer' || mode === 'ats' || mode === 'gap') && (
                 <div className="h-1/3 flex flex-col mt-4 pt-4 border-t border-stone-200">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Job Description</label>
                    <textarea
                        className="flex-1 bg-white border border-stone-200 p-3 text-stone-700 text-sm font-serif italic resize-none focus:border-teal-800 outline-none transition-colors"
                        placeholder="Paste Job Description for context..."
                        value={contextInput}
                        onChange={(e) => setContextInput(e.target.value)}
                    />
                 </div>
             )}

             {mode === 'optimizer' && (
                 <div className="flex gap-2 mt-4 pt-4 border-t border-stone-200">
                     <button onClick={() => setIntensity('strict')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border ${intensity === 'strict' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-400 border-stone-200'}`}>Strict</button>
                     <button onClick={() => setIntensity('creative')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border ${intensity === 'creative' ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-400 border-stone-200'}`}>Rewrite</button>
                 </div>
             )}

             <div className="pt-6 mt-4 border-t border-stone-200">
               <button
                 onClick={handleAction}
                 disabled={loading || !input}
                 className="w-full bg-stone-900 text-stone-50 py-3 px-6 font-bold uppercase tracking-widest text-xs hover:bg-teal-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {loading ? <RefreshCw className="animate-spin" size={14}/> : <Send size={14}/>}
                 {loading ? 'Processing...' : 'Analyze Text'}
               </button>
             </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="flex-1 h-full min-h-0">
          <div className="editorial-card rounded-none h-full flex flex-col relative overflow-hidden bg-white">
            <div className="p-4 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Output</span>
              {(optimizedResume && mode === 'optimizer') && <button className="text-teal-800 hover:text-teal-600 text-xs font-bold uppercase tracking-widest border border-teal-800 px-3 py-1 hover:bg-teal-50 transition-colors" onClick={() => DocumentUtils.generatePdfFromElement('resume-preview-content', 'Resume')}>Download PDF</button>}
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto bg-stone-50/30 custom-scrollbar">
               {loading ? (
                   <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                       <div className="w-12 h-12 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                       <p className="font-serif italic text-stone-500">Refining your content...</p>
                   </div>
               ) : presentationResult ? (
                   <div className="space-y-8 max-w-3xl mx-auto">
                        <div className="bg-white p-8 border border-stone-200 shadow-sm">
                            <h4 className="font-serif font-bold text-xl text-stone-900 mb-4 border-b border-stone-100 pb-2">Executive Summary</h4>
                            <p className="text-stone-700 font-serif leading-relaxed text-lg">{presentationResult.summary}</p>
                        </div>
                        
                        <div>
                            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-stone-400 mb-4">Boardroom Q&A Prep</h4>
                            <div className="grid gap-4">
                              {presentationResult.qa?.map((item: any, i: number) => (
                                  <div key={i} className="bg-white p-6 border-l-4 border-teal-800 shadow-sm">
                                      <p className="font-bold text-stone-900 mb-3 font-serif text-lg">"{item.question}"</p>
                                      <p className="text-stone-600 italic">Suggestion: {item.answer}</p>
                                  </div>
                              ))}
                            </div>
                        </div>

                        <div className="bg-stone-100 p-8">
                            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-stone-500 mb-4">Strategic Improvements</h4>
                            <ul className="space-y-4">
                                {presentationResult.improvements?.map((imp: string, i: number) => (
                                    <li key={i} className="flex gap-4 text-stone-800 items-start">
                                        <Lightbulb size={18} className="text-teal-700 shrink-0 mt-1" />
                                        <span className="font-serif leading-relaxed">{imp}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                   </div>
               ) : culturalResult ? (
                   <div className="max-w-2xl mx-auto space-y-8 py-8">
                       <div className="text-center">
                           <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Perception</h4>
                           <p className="text-3xl font-serif text-stone-900 italic">"{culturalResult.perception}"</p>
                       </div>
                       <div className="border-t border-b border-stone-200 py-6">
                           <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Subtext</h4>
                           <p className="text-stone-600 leading-relaxed">What Americans hear: <span className="font-semibold text-stone-800">"{culturalResult.hiddenMeaning}"</span></p>
                       </div>
                       <div>
                           <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-teal-800 mb-4">Recommended Alternatives</h4>
                           <div className="space-y-3">
                               {culturalResult.alternatives?.map((alt: string, i: number) => (
                                   <div key={i} className="flex gap-4 bg-white p-4 border border-stone-200 items-center shadow-sm">
                                       <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center text-teal-800 shrink-0"><Check size={14} /></div>
                                       <p className="font-serif text-lg text-stone-900">{alt}</p>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
               ) : gapResult ? (
                   <div className="max-w-3xl mx-auto space-y-8">
                       <div className="flex items-center justify-between border-b border-stone-200 pb-6">
                           <div>
                               <h4 className="font-serif font-bold text-2xl text-stone-900">Gap Analysis</h4>
                               <p className="text-stone-500 italic">Candidate vs. Role Fit</p>
                           </div>
                           <div className="text-right">
                               <span className="text-4xl font-bold text-stone-900">{gapResult.score}</span>
                               <span className="text-sm text-stone-400 uppercase tracking-widest block">Match Score</span>
                           </div>
                       </div>
                       <div className="grid md:grid-cols-2 gap-8">
                           <div>
                               <h4 className="font-bold text-xs uppercase tracking-widest text-rose-800 mb-4 flex items-center gap-2"><AlertCircle size={14}/> Critical Gaps</h4>
                               <ul className="space-y-2">
                                   {gapResult.missingHardSkills?.map((s: string, i: number) => (
                                       <li key={i} className="text-stone-700 border-b border-stone-100 pb-2">{s}</li>
                                   ))}
                               </ul>
                           </div>
                           <div>
                               <h4 className="font-bold text-xs uppercase tracking-widest text-stone-500 mb-4 flex items-center gap-2"><Layers size={14}/> Experience Missing</h4>
                               <ul className="space-y-2">
                                   {gapResult.experienceGaps?.map((s: string, i: number) => (
                                       <li key={i} className="text-stone-600 border-b border-stone-100 pb-2 italic">{s}</li>
                                   ))}
                               </ul>
                           </div>
                       </div>
                   </div>
               ) : optimizedResume ? (
                   <div id="resume-preview-content" className="resume-paper transform scale-[0.9] origin-top-center shadow-2xl mx-auto">
                       <div className="text-center border-b-2 border-stone-900 pb-6 mb-8">
                           <div className="group relative inline-block">
                                <h1 className="text-4xl font-serif font-bold uppercase tracking-widest text-stone-900 mb-2">{optimizedResume.fullName}</h1>
                                <button onClick={() => navigator.clipboard.writeText(optimizedResume.fullName)} className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-stone-300 hover:text-teal-700"><Copy size={14} /></button>
                           </div>
                           <ResumeSection title="" copyText={formatContactInfo(optimizedResume.contactInfo)} className="mb-0">
                                <p className="text-center text-sm font-serif italic text-stone-600 mt-2">{formatContactInfo(optimizedResume.contactInfo)}</p>
                           </ResumeSection>
                       </div>
                       <div className="grid grid-cols-12 gap-8">
                           <div className="col-span-4 space-y-8 border-r border-stone-200 pr-6">
                               {optimizedResume.skills && (
                                   <ResumeSection title="Core Competencies" copyText={formatSkillsForCopy(optimizedResume.skills)}>
                                       {renderSkills(optimizedResume.skills)}
                                   </ResumeSection>
                               )}
                               {optimizedResume.education && (
                                   <ResumeSection title="Education" copyText={formatEducationForCopy(optimizedResume.education)}>
                                       {Array.isArray(optimizedResume.education) ? optimizedResume.education.map((edu: any, i: number) => (
                                           <div key={i} className="mb-4">
                                               <div className="font-bold text-stone-900">{edu.school}</div>
                                               <div className="italic text-stone-600">{edu.degree}</div>
                                               <div className="text-xs text-stone-400 mt-1">{edu.year}</div>
                                           </div>
                                       )) : <p>{optimizedResume.education}</p>}
                                   </ResumeSection>
                               )}
                           </div>
                           <div className="col-span-8 space-y-8">
                               {optimizedResume.summary && <ResumeSection title="Executive Profile" copyText={optimizedResume.summary}><p className="text-justify leading-relaxed">{optimizedResume.summary}</p></ResumeSection>}
                               {optimizedResume.experience && (
                                   <ResumeSection title="Professional Experience" copyText={formatExperienceForCopy(optimizedResume.experience)}>
                                       {Array.isArray(optimizedResume.experience) ? optimizedResume.experience.map((exp: any, i: number) => (
                                           <div key={i} className="mb-6 last:mb-0">
                                               <div className="flex justify-between items-baseline mb-1">
                                                   <span className="font-bold text-lg text-stone-900">{exp.role}</span>
                                                   <span className="text-xs text-stone-500 font-sans">{exp.dates}</span>
                                               </div>
                                               <div className="font-serif italic text-stone-700 mb-3">{exp.company}</div>
                                               <ul className="list-disc pl-4 space-y-1 marker:text-stone-300">
                                                   {Array.isArray(exp.bullets) ? exp.bullets.map((b: string, idx: number) => (<li key={idx} className="pl-2 text-justify text-sm leading-relaxed text-stone-600">{b}</li>)) : <li>{exp.bullets}</li>}
                                               </ul>
                                           </div>
                                       )) : <p>{optimizedResume.experience}</p>}
                                   </ResumeSection>
                               )}
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="flex flex-col items-center justify-center h-full text-stone-300">
                       <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
                       <p className="font-serif italic">Your document preview will appear here.</p>
                   </div>
               )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}