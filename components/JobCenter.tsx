import React, { useState, useContext } from 'react';
import { Search, MapPin, ExternalLink, Briefcase, FileEdit, ArrowUpRight } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { UserContext } from '../UserContext';
import { JobListing } from '../types';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function JobCenter() {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setJobs([]);
    try {
      const results = await GeminiService.searchJobs(query, user.role);
      setJobs(results);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleDraftCoverLetter = (description: string) => {
      navigate('/writing', { state: { jobDescription: description } });
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-12 pb-12"
    >
      <motion.div variants={item} className="border-b border-stone-200 pb-6">
        <h2 className="text-5xl font-serif font-bold text-stone-900 mb-2">Opportunities.</h2>
        <p className="text-stone-500 font-serif italic text-lg">Curated roles for the global professional.</p>
      </motion.div>

      {/* Search Section */}
      <motion.div variants={item} className="max-w-3xl">
          <form onSubmit={handleSearch} className="relative">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by role, company, or keywords..."
                className="w-full bg-transparent border-b-2 border-stone-300 py-4 text-2xl font-serif text-stone-900 placeholder-stone-300 focus:border-stone-900 outline-none transition-colors"
                autoFocus
            />
            <button 
                type="submit"
                disabled={loading}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-bold uppercase tracking-widest text-stone-900 hover:text-teal-800 disabled:opacity-30"
            >
                {loading ? "Searching..." : "Search"}
            </button>
          </form>
          <div className="mt-4 flex gap-4 text-xs font-bold uppercase tracking-widest text-stone-400">
             <span>Trending:</span>
             {['Remote Product Manager', 'Senior Engineer', 'DevRel'].map(tag => (
                 <button key={tag} onClick={() => setQuery(tag)} className="hover:text-stone-900 transition-colors border-b border-transparent hover:border-stone-900">{tag}</button>
             ))}
          </div>
      </motion.div>

      {/* Results List */}
      <motion.div variants={container} className="space-y-6">
        {jobs.length > 0 && (
          <motion.div variants={item} className="flex justify-between items-end pb-2">
             <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Results</span>
             <span className="text-xs font-serif italic text-stone-500">{jobs.length} Positions Found</span>
          </motion.div>
        )}
        
        {loading && (
           <div className="space-y-6 opacity-50">
             {[1,2,3].map(i => <div key={i} className="h-32 bg-stone-100 animate-pulse"></div>)}
           </div>
        )}

        {jobs.map((job, idx) => (
          <motion.div 
            variants={item}
            key={idx} 
            className="editorial-card p-0 group bg-white"
          >
            <div className="flex flex-col md:flex-row">
                <div className="p-8 flex-1">
                    <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-2xl font-serif font-bold text-stone-900 group-hover:text-teal-900 transition-colors">{job.title}</h3>
                        <span className="text-xs font-bold uppercase tracking-widest text-stone-400 ml-4 shrink-0">{job.location}</span>
                    </div>
                    <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4">{job.company}</p>
                    <p className="text-stone-600 font-serif leading-relaxed line-clamp-2 max-w-4xl">{job.description}</p>
                </div>
                
                <div className="bg-stone-50 border-l border-stone-200 p-8 flex flex-col justify-center gap-3 md:w-64 shrink-0">
                    {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full bg-stone-900 text-stone-50 py-3 text-center text-xs font-bold uppercase tracking-widest hover:bg-teal-900 transition-colors">
                            Apply Direct
                        </a>
                    )}
                    <button 
                        onClick={() => handleDraftCoverLetter(job.description)}
                        className="w-full border border-stone-300 text-stone-600 py-3 text-center text-xs font-bold uppercase tracking-widest hover:bg-white hover:border-stone-900 hover:text-stone-900 transition-colors"
                    >
                        Write Letter
                    </button>
                </div>
            </div>
          </motion.div>
        ))}

        {!loading && jobs.length === 0 && query && (
          <motion.div variants={item} className="py-20 text-center border border-stone-200 bg-stone-50">
            <p className="font-serif text-xl text-stone-500 italic">No matches found for your search.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}