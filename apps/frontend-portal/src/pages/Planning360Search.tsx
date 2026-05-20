import React, { useEffect, useState } from 'react';
import { Search, Activity, Network, Server, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Planning360Search() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [subnets, setSubnets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalInsight, setGlobalInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, sRes, insightRes] = await Promise.all([
          axios.get('/api/ipam/blocks').catch(() => ({ data: [] })),
          axios.get('/api/ipam/subnets').catch(() => ({ data: [] })),
          axios.get('/api/insight/planning-360/global').catch(() => ({ data: null }))
        ]);
        setBlocks(bRes.data || []);
        setSubnets(sRes.data || []);
        setGlobalInsight(insightRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSubnets = subnets.filter(s => 
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.cidr && s.cidr.includes(searchTerm)) ||
    (s.vlan_type && s.vlan_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredBlocks = blocks.filter(b => 
    (b.name && b.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (b.cidr && b.cidr.includes(searchTerm))
  );

  return (
    <div className="space-y-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
               <Activity className="w-8 h-8 text-indigo-500" />
               <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Planning 360 Command Center</span>
            </h2>
            <p className="text-slate-400 text-sm">
               Global intelligence, search, and predictive capacity analytics for all telecom networks.
            </p>
         </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative group">
         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
         </div>
         <input 
            type="text" 
            placeholder="Search across all Subnets, Root Blocks, VLANs, and CIDRs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-5 bg-[#12121a]/80 backdrop-blur-xl border border-white/10 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-2xl transition-all"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Global Stats */}
         <div className="col-span-1 space-y-6">
            <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
               <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-6">Network Footprint</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-white/5 pb-4">
                     <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Root Blocks Managed</span>
                        <span className="text-3xl font-black text-white">{blocks.length}</span>
                     </div>
                     <Network className="w-8 h-8 text-indigo-500 opacity-50" />
                  </div>
                  <div className="flex justify-between items-end pb-2">
                     <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Active Subnets</span>
                        <span className="text-3xl font-black text-emerald-400">{subnets.length}</span>
                     </div>
                     <Server className="w-8 h-8 text-emerald-500 opacity-50" />
                  </div>
               </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
               <h3 className="text-xs font-bold tracking-widest uppercase text-indigo-400 mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Global Intelligence
               </h3>
               {globalInsight ? (
                  <div className="space-y-4">
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                        <span className="block text-xs text-slate-500 mb-1">Exhaustion Risks (&gt;80% Utilized)</span>
                        {globalInsight.exhaustionRisks?.length > 0 ? (
                           <ul className="space-y-2">
                              {globalInsight.exhaustionRisks.map((risk: any, i: number) => (
                                 <li key={i} className="flex justify-between items-center text-sm">
                                    <span onClick={() => navigate(`/planning-360/subnet/${risk.subnet_id}`)} className="text-amber-400 font-medium cursor-pointer hover:underline truncate mr-2">{risk.name}</span>
                                    <span className="text-amber-500 font-bold bg-amber-500/10 px-2 rounded">{risk.utilization}%</span>
                                 </li>
                              ))}
                           </ul>
                        ) : (
                           <span className="text-sm font-medium text-emerald-400">0 Subnets at risk</span>
                        )}
                     </div>
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                        <span className="block text-xs text-slate-500 mb-1">Orphaned IPs (No node linked)</span>
                        <div className="flex items-center gap-2">
                           <span className={`text-xl font-bold ${globalInsight.orphanedIps > 0 ? 'text-amber-500' : 'text-emerald-400'}`}>{globalInsight.orphanedIps}</span>
                           {globalInsight.orphanedIps > 0 && <span className="text-xs text-slate-400">Waste detected</span>}
                        </div>
                     </div>
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                        <span className="block text-xs text-slate-500 mb-1">Fragmented Blocks (&gt;10 Subnets)</span>
                        <span className="text-xl font-bold text-slate-300">{globalInsight.fragmentedBlocks?.length || 0}</span>
                     </div>
                  </div>
               ) : (
                  <div className="animate-pulse flex space-x-4">
                     <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                           <div className="h-4 bg-slate-700 rounded"></div>
                           <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Search Results */}
         <div className="col-span-2 space-y-6">
            {!searchTerm && (
               <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                     <Zap className="w-5 h-5 text-indigo-400" /> Recently Provisioned Subnets
                  </h3>
                  <div className="space-y-3">
                     {subnets.slice(0, 5).map((s: any) => (
                        <div key={s.id} onClick={() => navigate(`/planning-360/subnet/${s.id}`)} className="flex items-center justify-between p-4 rounded-2xl bg-black/30 hover:bg-white/5 border border-white/5 cursor-pointer transition-all group">
                           <div>
                              <div className="flex items-center gap-3 mb-1">
                                 <span className="font-bold text-white">{s.name}</span>
                                 <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-500/30">{s.cidr}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                 {s.service_type && <span>{s.service_type}</span>}
                                 {s.vlan_type && <span>• {s.vlan_type}</span>}
                                 {s.requester_name && <span>• Req: {s.requester_name}</span>}
                              </div>
                           </div>
                           <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                     ))}
                     {subnets.length === 0 && !loading && (
                        <p className="text-slate-500 text-sm text-center py-8">No subnets found. Go to Topology to create one.</p>
                     )}
                  </div>
               </div>
            )}

            {searchTerm && (
               <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                  <h3 className="text-sm font-bold text-white mb-6">Search Results</h3>
                  
                  {filteredBlocks.length > 0 && (
                     <div className="mb-8">
                        <h4 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">Root Blocks</h4>
                        <div className="space-y-2">
                           {filteredBlocks.map(b => (
                              <div key={b.id} onClick={() => navigate(`/planning-360/pool/${b.id}`)} className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-white/5 border border-white/5 cursor-pointer transition-all group">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bold text-white">{b.name}</span>
                                    <span className="text-slate-400 font-mono text-xs">{b.cidr}</span>
                                 </div>
                                 <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {filteredSubnets.length > 0 && (
                     <div>
                        <h4 className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">Subnets</h4>
                        <div className="space-y-2">
                           {filteredSubnets.map(s => (
                              <div key={s.id} onClick={() => navigate(`/planning-360/subnet/${s.id}`)} className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-white/5 border border-white/5 cursor-pointer transition-all group">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bold text-white">{s.name}</span>
                                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded font-mono border border-indigo-500/30">{s.cidr}</span>
                                 </div>
                                 <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400" />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {filteredBlocks.length === 0 && filteredSubnets.length === 0 && (
                     <div className="py-12 text-center">
                        <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No results found for "{searchTerm}"</p>
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
