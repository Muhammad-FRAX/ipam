import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, XCircle, Search, AlertTriangle, Info, Network, SplitSquareHorizontal } from 'lucide-react';
import axios from 'axios';

export default function Discovery() {
  const [targetCidr, setTargetCidr] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [subnets, setSubnets] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bRes, sRes] = await Promise.all([
          axios.get('/api/ipam/blocks').catch(() => ({ data: [] })),
          axios.get('/api/ipam/subnets').catch(() => ({ data: [] }))
        ]);
        setBlocks(bRes.data || []);
        setSubnets(sRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const ipToLong = (ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return 0;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  };

  const longToIp = (n: number) => {
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  };

  const getSubnetRange = (cidr: string) => {
    const [ip, prefixStr] = cidr.split('/');
    if (!ip || !prefixStr) return null;
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    
    const ipLong = ipToLong(ip);
    if (ipLong === 0 && ip !== '0.0.0.0') return null;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const network = (ipLong & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    
    return {
      network,
      broadcast,
      networkIp: longToIp(network),
      broadcastIp: longToIp(broadcast),
      firstIp: prefix >= 31 ? longToIp(network) : longToIp(network + 1),
      lastIp: prefix >= 31 ? longToIp(broadcast) : longToIp(broadcast - 1),
      maskLong: mask,
      maskIp: longToIp(mask),
      totalHosts: prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, broadcast - network - 1),
      prefix
    };
  };

  const checkOverlaps = (targetNet: number, targetBcast: number) => {
    const overlaps: any[] = [];
    let isContainedByRoot = false;
    let parentBlock = null;

    blocks.forEach(b => {
      const bRange = getSubnetRange(b.cidr);
      if (!bRange) return;
      
      // Is target completely inside this block?
      if (targetNet >= bRange.network && targetBcast <= bRange.broadcast) {
        isContainedByRoot = true;
        parentBlock = b;
      } else if (!(targetBcast < bRange.network || targetNet > bRange.broadcast)) {
         // Partial overlap with root block
         overlaps.push({ type: 'ROOT_BLOCK', name: b.name, cidr: b.cidr });
      }
    });

    subnets.forEach(s => {
      const sRange = getSubnetRange(s.cidr);
      if (!sRange) return;
      // Overlap logic: ranges intersect
      if (!(targetBcast < sRange.network || targetNet > sRange.broadcast)) {
         overlaps.push({ type: 'SUBNET', name: s.name, cidr: s.cidr, status: s.status });
      }
    });

    return { overlaps, isContainedByRoot, parentBlock };
  };

  const handleAnalyze = () => {
    const range = getSubnetRange(targetCidr.trim());
    if (!range) {
      setAnalysis({ error: 'Invalid CIDR format. Please use format X.X.X.X/Y' });
      return;
    }

    const collisionData = checkOverlaps(range.network, range.broadcast);
    setAnalysis({
      range,
      collisionData
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
               <Calculator className="w-8 h-8 text-indigo-500" />
               <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Subnet Discovery & Calculator</span>
            </h2>
            <p className="text-slate-400 text-sm">
               Evaluate IP ranges, calculate subnet masks, and check availability against existing allocations before planning a new project.
            </p>
         </div>
      </div>

      <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
         
         <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10">
            <div className="flex-1 relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
               </div>
               <input 
                  type="text" 
                  placeholder="Enter Target CIDR (e.g. 10.1.5.0/24)" 
                  value={targetCidr}
                  onChange={(e) => setTargetCidr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="block w-full pl-12 pr-4 py-4 bg-black/50 border border-white/10 rounded-2xl text-lg text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
               />
            </div>
            <button 
               onClick={handleAnalyze}
               className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-bold tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0"
            >
               <Calculator className="w-5 h-5" /> Evaluate Range
            </button>
         </div>

         {analysis && analysis.error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
               <XCircle className="w-5 h-5 shrink-0" />
               <p className="font-medium text-sm">{analysis.error}</p>
            </div>
         )}

         {analysis && !analysis.error && (
            <div className="space-y-6 mt-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                     <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Network Address</span>
                     <span className="text-lg font-mono text-white">{analysis.range.networkIp}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                     <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Broadcast Address</span>
                     <span className="text-lg font-mono text-white">{analysis.range.broadcastIp}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                     <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Subnet Mask</span>
                     <span className="text-lg font-mono text-slate-300">{analysis.range.maskIp}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl">
                     <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Total Usable Hosts</span>
                     <span className="text-lg font-bold text-indigo-400">{analysis.range.totalHosts.toLocaleString()}</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Availability Status */}
                  <div className={`p-6 rounded-3xl border ${analysis.collisionData.overlaps.length === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                     <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-white">
                        Availability Status
                     </h3>
                     {analysis.collisionData.overlaps.length === 0 ? (
                        <div>
                           <div className="flex items-center gap-3 mb-4">
                              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                              <span className="text-2xl font-black text-emerald-400">Range Available</span>
                           </div>
                           <p className="text-emerald-200/70 text-sm">This CIDR block does not collide with any existing subnets. It is safe to use for a new project.</p>
                           
                           {analysis.collisionData.isContainedByRoot ? (
                              <div className="mt-4 flex items-center gap-2 bg-emerald-950/50 p-3 rounded-xl border border-emerald-500/10">
                                 <Network className="w-4 h-4 text-emerald-400" />
                                 <span className="text-xs text-emerald-300 font-medium">Validly contained within Root Block: {analysis.collisionData.parentBlock.cidr} ({analysis.collisionData.parentBlock.name})</span>
                              </div>
                           ) : (
                              <div className="mt-4 flex items-center gap-2 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                 <AlertTriangle className="w-4 h-4 text-amber-500" />
                                 <span className="text-xs text-amber-400 font-medium">Warning: This range is NOT contained in any managed Root Block. You must create the Root Block first.</span>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div>
                           <div className="flex items-center gap-3 mb-4">
                              <XCircle className="w-8 h-8 text-red-500" />
                              <span className="text-2xl font-black text-red-500">Collision Detected</span>
                           </div>
                           <p className="text-red-200/70 text-sm mb-4">This range cannot be allocated. It overlaps with {analysis.collisionData.overlaps.length} existing assignment(s).</p>
                           
                           <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                              {analysis.collisionData.overlaps.map((ov: any, idx: number) => (
                                 <div key={idx} className="bg-black/40 border border-red-500/10 p-3 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       {ov.type === 'ROOT_BLOCK' ? <Network className="w-4 h-4 text-slate-400" /> : <SplitSquareHorizontal className="w-4 h-4 text-indigo-400" />}
                                       <span className="text-sm font-bold text-slate-200">{ov.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <span className="font-mono text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/20">{ov.cidr}</span>
                                       <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{ov.type}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Calculator Context */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                     <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-slate-400">
                           <Info className="w-4 h-4" /> Routing Context
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-300">
                           <li className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-slate-500">First Usable IP</span>
                              <span className="font-mono text-indigo-300">{analysis.range.firstIp}</span>
                           </li>
                           <li className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-slate-500">Last Usable IP</span>
                              <span className="font-mono text-indigo-300">{analysis.range.lastIp}</span>
                           </li>
                           <li className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-slate-500">CIDR Notation</span>
                              <span className="font-mono text-white">/{analysis.range.prefix}</span>
                           </li>
                        </ul>
                     </div>
                     <div className="mt-6 pt-4 border-t border-white/5">
                        {analysis.collisionData.overlaps.length === 0 && analysis.collisionData.isContainedByRoot && (
                           <button 
                              onClick={() => {
                                 // Simple redirect with query param for pre-filling the Subnets modal if we want
                                 window.location.href = '/topology';
                              }}
                              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-3 rounded-xl font-bold transition-all"
                           >
                              Proceed to Allocate in Topology
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
