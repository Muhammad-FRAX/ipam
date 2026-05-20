import React, { useState, useEffect } from 'react';
import { History, Search, FileText, User, Tag, Clock, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get('/api/audit');
        setLogs(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.entity && log.entity.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.entity_id && log.entity_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
               <History className="w-8 h-8 text-indigo-500" />
               <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">System Audit Trail</span>
            </h2>
            <p className="text-slate-400 text-sm">
               Immutable record of all administrative actions, allocations, and policy changes across the platform.
            </p>
         </div>
      </div>

      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

         <div className="relative mb-6 z-10 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Search className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
            </div>
            <input 
               type="text" 
               placeholder="Search by Action, Entity, User ID, or Resource ID..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="block w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
         </div>

         {loading ? (
            <div className="animate-pulse space-y-4">
               {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/5"></div>
               ))}
            </div>
         ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center">
               <FileText className="w-12 h-12 mb-4 opacity-50" />
               <p>No audit logs found matching your search.</p>
            </div>
         ) : (
            <div className="space-y-4 relative z-10">
               {filteredLogs.map((log) => (
                  <div key={log.id} className="bg-black/40 border border-white/5 p-5 rounded-2xl hover:bg-white/5 transition-all group">
                     <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex items-start gap-4">
                           <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0">
                              <History className="w-5 h-5 text-indigo-400" />
                           </div>
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                 <span className="font-bold text-white text-base">{log.action}</span>
                                 <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700">{log.entity}</span>
                                 <span className="text-xs font-mono text-indigo-300">ID: {log.entity_id}</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                 <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.user_id}</span>
                                 <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                           </div>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                           <div className="bg-black/60 p-3 rounded-xl border border-white/5 text-xs font-mono text-slate-400 max-w-xs w-full overflow-hidden shrink-0 group-hover:border-indigo-500/30 transition-colors">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                           </div>
                        )}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
}
