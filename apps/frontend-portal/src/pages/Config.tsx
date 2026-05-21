import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function Config() {
  const [appTitle, setAppTitle] = useState('Antigravity IPAM');
  const [appLogo, setAppLogo] = useState('');
  const [highUtil, setHighUtil] = useState(80);
  const [maxIps, setMaxIps] = useState(65536);
  const [exhaustionWarningPct, setExhaustionWarningPct] = useState(80);
  const [riskPoolMinAllocations, setRiskPoolMinAllocations] = useState(5);
  const [orgStructure, setOrgStructure] = useState<any[]>([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await axios.get('/api/config/');
        const configMap = res.data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        if (configMap.app_title) setAppTitle(configMap.app_title);
        if (configMap.app_logo) setAppLogo(configMap.app_logo);
        if (configMap.high_util) setHighUtil(configMap.high_util);
        if (configMap.max_ips) setMaxIps(configMap.max_ips);
        if (configMap.exhaustion_warning_pct) setExhaustionWarningPct(configMap.exhaustion_warning_pct);
        if (configMap.risk_pool_min_allocations) setRiskPoolMinAllocations(configMap.risk_pool_min_allocations);
        if (configMap.org_structure) {
            try {
               let parsed = configMap.org_structure;
               for (let i = 0; i < 3 && typeof parsed === 'string'; i++) {
                  parsed = JSON.parse(parsed);
               }
               setOrgStructure(Array.isArray(parsed) ? parsed : []);
            } catch(e) {
               console.error('Failed to parse org_structure:', e);
               setOrgStructure([]);
            }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfigs();
  }, []);

  const handleSave = async () => {
    try {
      await axios.put('/api/config/app_title', { value: appTitle });
      await axios.put('/api/config/app_logo', { value: appLogo });
      await axios.put('/api/config/high_util', { value: highUtil });
      await axios.put('/api/config/max_ips', { value: maxIps });
      await axios.put('/api/config/exhaustion_warning_pct', { value: exhaustionWarningPct });
      await axios.put('/api/config/risk_pool_min_allocations', { value: riskPoolMinAllocations });
      await axios.put('/api/config/org_structure', { value: orgStructure });
      alert('Settings saved successfully!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-4">
         <div>
            <h2 className="text-xl font-bold text-white">Platform Settings</h2>
            <p className="text-sm text-slate-400 mt-1">Configure global branding, thresholds, and metadata.</p>
         </div>
         <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition flex items-center gap-2">
            <Save className="w-4 h-4" /> Save All Changes
         </button>
      </div>

      <div className="space-y-6">
         {/* Branding Settings */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h3 className="text-md font-semibold text-white mb-4">Platform Branding</h3>
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">App Title</label>
                  <input type="text" value={appTitle} onChange={e => setAppTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Logo URL (Optional)</label>
                  <input type="text" value={appLogo} onChange={e => setAppLogo(e.target.value)} placeholder="https://example.com/logo.png" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
            </div>
         </div>

         {/* Metadata Thresholds Setting */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h3 className="text-md font-semibold text-white mb-4">Risk Thresholds</h3>
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">High Utilization Warning (%)</label>
                  <input type="number" value={highUtil} onChange={e => setHighUtil(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Maximum IPs per block</label>
                  <input type="number" value={maxIps} onChange={e => setMaxIps(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Exhaustion Warning Threshold (%)</label>
                  <input type="number" value={exhaustionWarningPct} onChange={e => setExhaustionWarningPct(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Risk Pool Min Allocations</label>
                  <input type="number" value={riskPoolMinAllocations} onChange={e => setRiskPoolMinAllocations(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
               </div>
            </div>
         </div>

         {/* Taxonomy Settings */}
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-semibold text-white">Organizational Map</h3>
                <button onClick={() => setOrgStructure([...orgStructure, { division: '', departments: [] }])} className="text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-md border border-indigo-500/20 flex items-center gap-1 font-medium"><Plus className="w-4 h-4"/> Add Division</button>
            </div>
            
            <div className="space-y-4">
               {orgStructure.map((org, index) => (
                   <div key={index} className="bg-slate-950 border border-slate-800 p-4 rounded-lg relative">
                       <button onClick={() => {
                           const newOrg = [...orgStructure];
                           newOrg.splice(index, 1);
                           setOrgStructure(newOrg);
                       }} className="absolute top-4 right-4 text-slate-500 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                       
                       <div className="mb-4 pr-8">
                           <label className="block text-xs font-medium text-slate-400 mb-1 border-b border-slate-800 pb-1">Division Name</label>
                           <input type="text" value={org.division} onChange={e => {
                               const newOrg = [...orgStructure];
                               newOrg[index].division = e.target.value;
                               setOrgStructure(newOrg);
                           }} className="bg-transparent text-white font-semibold text-lg focus:outline-none w-full placeholder-slate-700" placeholder="e.g. Technology" />
                       </div>
                       
                       <div>
                           <label className="block text-xs font-medium text-slate-400 mb-2">Departments (Comma Separated)</label>
                           <input type="text" value={org._rawDeps !== undefined ? org._rawDeps : (org.departments || []).join(', ')} onChange={e => {
                               const newOrg = [...orgStructure];
                               newOrg[index]._rawDeps = e.target.value;
                               newOrg[index].departments = e.target.value.split(',').map((d:string) => d.trim()).filter((d:string) => d);
                               setOrgStructure(newOrg);
                           }} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 placeholder-slate-700" placeholder="e.g. Networking, Infrastructure, Security" />
                       </div>
                   </div>
               ))}
               {orgStructure.length === 0 && <p className="text-slate-500 text-sm italic">No divisions defined. Add one above.</p>}
            </div>
         </div>
      </div>
    </div>
  );
}
