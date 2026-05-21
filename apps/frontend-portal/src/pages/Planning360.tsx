import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Activity, BarChart, Download, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../components/Toast';
import { downloadFromApi } from '../lib/download';

export default function Planning360() {
  const toast = useToast();
  const { type, id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`/api/insight/planning-360/${type}/${id}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  const handleExport = async (format: string) => {
    try {
      await downloadFromApi(
        `/api/insight/export/${type}?format=${format}&id=${id}`,
        `${type}-${id}`,
        format
      );
    } catch (err: any) {
      toast.error(err?.response?.status === 401 ? 'Session expired. Please sign in again.' : 'Export failed');
    }
  };

  if (loading) return <div className="text-white p-8">Building 360 Context...</div>;
  if (!data) return <div className="text-red-400 p-8">Entity not found or aggregation failed.</div>;

  const pieData = type === 'subnet' && data.capacity ? [
    { name: 'Allocated', value: data.capacity.allocated },
    { name: 'Free', value: data.capacity.free }
  ] : [];
  const COLORS = ['#6366f1', '#1e293b'];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4 text-slate-400 text-sm mb-4">
        <Link to="/topology" className="hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back to Topology</Link>
        <span>/</span>
        <span className="text-indigo-400 capitalize">{type} 360</span>
      </div>

      <div className="flex justify-between items-end pb-4 border-b border-slate-800">
        <div>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <Activity className="w-6 h-6 text-indigo-500" />
             {data.identity.name || data.identity.requestedCidr || data.identity.id}
           </h2>
           <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest">{type} INTELLIGENCE</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => handleExport('csv')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 flex items-center gap-2 rounded-lg text-sm transition"><Download className="w-4 h-4"/> CSV</button>
           <button onClick={() => handleExport('xlsx')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 flex items-center gap-2 rounded-lg text-sm transition"><Download className="w-4 h-4"/> Excel</button>
           <button onClick={() => handleExport('pdf')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 flex items-center gap-2 rounded-lg text-sm transition"><Download className="w-4 h-4"/> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Identity Panel */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">IDENTITY & ROUTING</h3>
            <div className="space-y-3">
               <div>
                  <span className="block text-xs text-slate-500">CIDR Range</span>
                  <span className="text-lg font-mono text-purple-400">{data.identity.cidr || data.identity.requestedCidr || 'N/A'}</span>
               </div>
               <div>
                  <span className="block text-xs text-slate-500">Global ID</span>
                  <span className="text-sm font-mono text-slate-300">{data.identity.id}</span>
               </div>
               {data.identity.vlan_type && (
                  <div>
                     <span className="block text-xs text-slate-500">VLAN Type</span>
                     <span className="text-sm font-medium text-slate-300">{data.identity.vlan_type}</span>
                  </div>
               )}
               {data.identity.requester_name && (
                  <div>
                     <span className="block text-xs text-slate-500">Requested By</span>
                     <span className="text-sm font-medium text-slate-300">{data.identity.requester_name} ({data.identity.requester_department})</span>
                  </div>
               )}
               <div>
                  <span className="block text-xs text-slate-500">Current Status</span>
                  <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{data.identity.status}</span>
               </div>
            </div>
         </div>

         {/* Capacity Gauge */}
         {(type === 'subnet' || type === 'pool') && (
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">CAPACITY GAUGE</h3>
            {type === 'subnet' ? (
               <div className="flex-1 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-2xl font-bold text-white">{data.capacity.utilizationPercent}%</span>
                     <span className="text-[10px] text-slate-500">Utilized</span>
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col justify-center space-y-4">
                  <div>
                    <span className="block text-xs text-slate-500">Total Subnets Built</span>
                    <span className="text-2xl font-bold text-white">{data.capacity.totalSubnets}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500">Active Subnets</span>
                    <span className="text-2xl font-bold text-indigo-400">{data.capacity.activeSubnets}</span>
                  </div>
               </div>
            )}
         </div>
         )}

         {/* Actionable Insights */}
         <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
              <BarChart className="w-4 h-4"/> ACTIONABLE INSIGHTS
            </h3>
            {type === 'subnet' && (
              <div className="space-y-4">
                 <div>
                    <span className="block text-xs text-indigo-400/70">Exhaustion Risk</span>
                    <div className="flex items-center gap-2 mt-1">
                      {data.insight.exhaustionRisk === 'HIGH' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      <span className={`text-lg font-bold ${data.insight.exhaustionRisk === 'HIGH' ? 'text-amber-500' : 'text-emerald-400'}`}>{data.insight.exhaustionRisk}</span>
                    </div>
                 </div>
                 <div className="bg-indigo-950/50 p-3 rounded-lg border border-indigo-500/10">
                    <span className="block text-xs text-slate-400 mb-1">Recommendation</span>
                    <p className="text-sm text-slate-200 leading-relaxed">{data.insight.recommendation}</p>
                 </div>
              </div>
            )}
            {type === 'pool' && (
               <div className="space-y-4">
                 <div>
                    <span className="block text-xs text-indigo-400/70">Allocation Pressure</span>
                    <span className="text-lg font-bold text-white mt-1 block">{data.insight.allocationPressure}</span>
                 </div>
                 <div>
                    <span className="block text-xs text-indigo-400/70">Fragmentation Indicator</span>
                    <span className="text-sm font-medium text-slate-300 mt-1 block">{data.insight.fragmentationIndicator}</span>
                 </div>
               </div>
            )}
            {type === 'request' && (
               <div className="space-y-4">
                 <div>
                    <span className="block text-xs text-indigo-400/70">SLA Violation Risk</span>
                    <span className="text-lg font-bold text-white mt-1 block">{data.insight.slaViolationRisk}</span>
                 </div>
                 <div className="bg-indigo-950/50 p-3 rounded-lg border border-indigo-500/10">
                    <p className="text-sm text-slate-300">Request is currently in {data.identity.status}. Approvals usually map linearly at this stage.</p>
                 </div>
               </div>
            )}
         </div>
      </div>
      
      {/* Tables / Lists */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-8">
         <div className="px-5 py-4 border-b border-slate-800">
           <h3 className="text-sm font-semibold text-slate-300">Detailed Telemetry</h3>
         </div>
         {type === 'subnet' && data.allocations && (
           <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-slate-950/50 text-slate-400">
               <tr>
                 <th className="px-5 py-3">IP Address</th>
                 <th className="px-5 py-3">Node Details</th>
                 <th className="px-5 py-3">Ownership</th>
                 <th className="px-5 py-3">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/50">
               {data.allocations.length === 0 ? (
                 <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-500">No telemetry nodes found in this subnet.</td></tr>
               ) : data.allocations.map((a: any, i: number) => (
                 <tr key={i} className="hover:bg-slate-800/20">
                   <td className="px-5 py-3 font-mono text-purple-400 font-bold">{a.ip_address}</td>
                   <td className="px-5 py-3">
                      {a.metadata?.nodeDetails ? (
                         <span className="text-slate-300 font-medium">{a.metadata.nodeDetails}</span>
                      ) : (
                         <span className="text-slate-500 text-xs italic">-</span>
                      )}
                   </td>
                   <td className="px-5 py-3">
                      {a.metadata?.division ? (
                         <div className="flex items-center gap-2 text-xs">
                            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-indigo-300">{a.metadata.division}</span>
                            {a.metadata.department && <span className="text-slate-500">/</span>}
                            {a.metadata.department && <span className="bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded text-slate-400">{a.metadata.department}</span>}
                         </div>
                      ) : (
                         <pre className="text-[10px] text-slate-600 max-w-xs truncate">{JSON.stringify(a.metadata)}</pre>
                      )}
                   </td>
                   <td className="px-5 py-3"><span className="text-indigo-400 text-xs px-2 py-1 rounded font-bold uppercase bg-indigo-500/10 border border-indigo-500/20">{a.status}</span></td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
         {type === 'request' && data.audit && (
           <table className="w-full text-left text-sm whitespace-nowrap">
             <thead className="bg-slate-950/50 text-slate-400">
               <tr>
                 <th className="px-5 py-3">Timestamp</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Details</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/50">
               {data.audit.map((a: any, i: number) => (
                 <tr key={i} className="hover:bg-slate-800/20">
                   <td className="px-5 py-3 text-slate-400 text-xs">{new Date(a.timestamp).toLocaleString()}</td>
                   <td className="px-5 py-3 text-emerald-400">{a.action}</td>
                   <td className="px-5 py-3 text-slate-300"><pre className="text-xs">{JSON.stringify(a.details)}</pre></td>
                 </tr>
               ))}
             </tbody>
           </table>
         )}
      </div>
    </div>
  );
}
