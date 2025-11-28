import React, { useContext } from 'react';
import { UserContext } from '../UserContext';
import { ArrowUpRight, PlayCircle, Trophy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const MetricCard = ({ label, value, sub, dark = false }: { label: string, value: string | number, sub?: string, dark?: boolean }) => (
    <div className={`p-6 flex flex-col justify-between h-full border ${dark ? 'bg-stone-900 text-stone-50 border-stone-900' : 'bg-white text-stone-900 border-stone-200'}`}>
        <div className="flex justify-between items-start">
            <span className={`text-xs uppercase tracking-widest font-bold ${dark ? 'text-stone-400' : 'text-stone-400'}`}>{label}</span>
            {dark && <Activity size={16} className="text-teal-400" />}
        </div>
        <div>
            <span className={`text-4xl font-serif font-bold block mb-1 ${dark ? 'text-white' : 'text-stone-900'}`}>{value}</span>
            {sub && <span className={`text-xs ${dark ? 'text-stone-400' : 'text-stone-500'}`}>{sub}</span>}
        </div>
    </div>
);

const Dashboard = () => {
  const { user } = useContext(UserContext);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[400px]">
        
        {/* Editorial Hero */}
        <div className="md:col-span-8 bg-[#e7e5e4] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute inset-0 bg-grain opacity-20 pointer-events-none" />
            <div className="relative z-10 max-w-xl">
                <span className="inline-block py-1 px-3 border border-stone-800 rounded-full text-xs font-bold uppercase tracking-widest mb-6">Today's Focus</span>
                <h1 className="text-5xl md:text-6xl font-serif font-bold text-stone-900 leading-[0.9] mb-6">
                    Mastering the<br/>
                    <span className="italic font-light">Art of Negotiation</span>
                </h1>
                <p className="text-stone-700 text-lg mb-8 max-w-md font-serif italic">
                    Learn to navigate high-stakes conversations with the nuance of an executive.
                </p>
                <Link to="/conversation" className="inline-flex items-center gap-2 text-stone-900 font-bold border-b-2 border-stone-900 pb-1 hover:text-teal-800 hover:border-teal-800 transition-colors">
                    Start Simulation <ArrowUpRight size={18} />
                </Link>
            </div>
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-stone-300 rounded-full blur-[80px] opacity-0 group-hover:opacity-40 transition-opacity duration-1000" />
        </div>

        {/* Quick Stats Column */}
        <div className="md:col-span-4 grid grid-rows-2 gap-6">
            <MetricCard label="Current Level" value={user.level} sub={`${user.xp} XP Earned`} dark />
            <MetricCard label="Day Streak" value={user.streak} sub="Consistency is key" />
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="editorial-card p-8">
              <h3 className="font-serif font-bold text-xl mb-4">Recent Activity</h3>
              <div className="space-y-4">
                  {[1,2,3].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                          <div className="w-10 h-10 bg-stone-100 flex items-center justify-center text-stone-400 font-serif italic">0{i+1}</div>
                          <div>
                              <p className="font-bold text-stone-800 text-sm">Salary Negotiation</p>
                              <p className="text-xs text-stone-500">Live Simulation • 92% Score</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          <div className="editorial-card p-8 bg-stone-50">
               <h3 className="font-serif font-bold text-xl mb-4">Recommended</h3>
               <Link to="/accent" className="block group cursor-pointer">
                   <div className="aspect-video bg-stone-200 mb-4 relative overflow-hidden">
                       <div className="absolute inset-0 flex items-center justify-center bg-stone-900/10 group-hover:bg-stone-900/20 transition-colors">
                           <PlayCircle size={48} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                       </div>
                   </div>
                   <h4 className="font-bold text-stone-900 group-hover:underline decoration-1 underline-offset-4">Vocal Presence 101</h4>
                   <p className="text-xs text-stone-500 mt-1">Reduce filler words and project confidence.</p>
               </Link>
          </div>

          <div className="editorial-card p-8 flex flex-col justify-center text-center border-stone-200">
               <Trophy size={48} className="text-teal-700 mx-auto mb-4" strokeWidth={1} />
               <h3 className="font-serif font-bold text-xl mb-2">Weekly Leaderboard</h3>
               <p className="text-stone-500 text-sm mb-6">You are in the top 15% of learners this week.</p>
               <button className="text-xs font-bold uppercase tracking-widest text-stone-900 border border-stone-200 py-3 hover:bg-stone-900 hover:text-white transition-colors">View Ranking</button>
          </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;