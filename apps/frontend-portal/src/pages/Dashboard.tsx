import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Server, Activity, Database, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [metricRes, riskRes] = await Promise.all([
          axios.get('/api/insight/dashboard/metrics'),
          axios.get('/api/insight/dashboard/risks')
        ]);
        setMetrics(metricRes.data);
        setRisks(riskRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading metrics...</div>;
  }

  const { totalBlocks, totalSubnets, allocatedIps, overallUtilizationPercent, historicalData } = metrics || {};
  const isHighUtil = (overallUtilizationPercent || 0) > 80;

  const actualHistory = historicalData && historicalData.length > 0 
    ? historicalData 
    : [{ name: new Date().toLocaleString('default', { month: 'short' }), allocated: 0 }];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Root Blocks" value={totalBlocks || 0} icon={Database} glowColor="bg-blue-500/20" bgColor="bg-blue-500/10" borderColor="border-blue-500/20" textColor="text-blue-500" />
        <StatCard title="Total Subnets" value={totalSubnets || 0} icon={Server} glowColor="bg-indigo-500/20" bgColor="bg-indigo-500/10" borderColor="border-indigo-500/20" textColor="text-indigo-500" />
        <StatCard title="Allocated IPs" value={allocatedIps || 0} icon={Activity} glowColor="bg-emerald-500/20" bgColor="bg-emerald-500/10" borderColor="border-emerald-500/20" textColor="text-emerald-500" />
        <StatCard 
           title="Utilization %" 
           value={(overallUtilizationPercent || 0) + '%'} 
           icon={AlertCircle} 
           glowColor={isHighUtil ? "bg-red-500/20" : "bg-purple-500/20"} 
           bgColor={isHighUtil ? "bg-red-500/10" : "bg-purple-500/10"} 
           borderColor={isHighUtil ? "border-red-500/20" : "border-purple-500/20"} 
           textColor={isHighUtil ? "text-red-500" : "text-purple-500"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl shadow-black/50 hover:border-white/10 transition-all duration-300 group">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-8 tracking-wide">Allocation Forecast & Trend</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={actualHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="allocated" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorAllocated)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl shadow-black/50 hover:border-white/10 transition-all duration-300 flex flex-col group">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-8 tracking-wide flex items-center justify-between">
            High Risk Subnets
            <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
               <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
               Action Needed
            </span>
          </h2>
          <div className="flex-1 overflow-auto">
            {risks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <AlertCircle className="w-12 h-12 mb-3 text-slate-700" />
                <p>No high-risk subnets identified.</p>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {risks.map((risk, i) => (
                  <div key={i} className="flex flex-col p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-white/10 group/item">
                    <div className="flex justify-between items-center mb-3">
                       <span className="font-semibold tracking-wide text-slate-200 inline-block truncate max-w-[120px]" title={risk.cidr}>{risk.cidr}</span>
                       <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/10 group-hover/item:border-red-500/30 transition-colors">{risk.allocated_count} IPs</span>
                    </div>
                    <div className="w-full bg-[#0a0a0e] rounded-full h-2 overflow-hidden border border-white/5">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full w-[85%] shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, glowColor, bgColor, borderColor, textColor }: any) {
  return (
    <div className={`relative overflow-hidden bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex items-center gap-6 shadow-2xl shadow-black/20 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-500 cursor-pointer group`}>
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full ${glowColor} filter blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}></div>
      <div className={`w-16 h-16 rounded-2xl ${bgColor} flex items-center justify-center shrink-0 border ${borderColor} shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] group-hover:scale-110 transition-transform duration-500`}>
        <Icon className={`w-8 h-8 ${textColor}`} />
      </div>
      <div className="z-10">
        <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mb-1">{title}</p>
        <p className="text-4xl font-black text-white tracking-tight drop-shadow-md">{value}</p>
      </div>
    </div>
  );
}
