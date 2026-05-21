import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Building2, Share2, Server, Router, Network, X } from 'lucide-react';

export default function NetworkAssets() {
  const [activeTab, setActiveTab] = useState<'sites' | 'domains' | 'vlans' | 'devices'>('sites');

  const [sites, setSites] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [vlans, setVlans] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    try {
      const [siteRes, domRes, vlanRes, devRes] = await Promise.all([
        axios.get('/api/ipam/sites').catch(() => ({ data: [] })),
        axios.get('/api/ipam/domains').catch(() => ({ data: [] })),
        axios.get('/api/ipam/vlans').catch(() => ({ data: [] })),
        axios.get('/api/ipam/devices').catch(() => ({ data: [] }))
      ]);
      setSites(siteRes.data?.items ?? []);
      setDomains(domRes.data?.items ?? []);
      setVlans(vlanRes.data?.items ?? []);
      setDevices(devRes.data?.items ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'sites') {
        await axios.post('/api/ipam/sites', formData);
      } else if (activeTab === 'domains') {
        await axios.post('/api/ipam/domains', formData);
      } else if (activeTab === 'vlans') {
        await axios.post('/api/ipam/vlans', { ...formData, vlanId: parseInt(formData.vlanId) });
      } else if (activeTab === 'devices') {
        await axios.post('/api/ipam/devices', formData);
      }
      setShowModal(false);
      setFormData({});
      loadData();
    } catch (e) {
      alert('Failed to create resource.');
    }
  };

  const openModal = () => {
    setFormData({});
    setShowModal(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Telecom Resources Manager</h2>
           <p className="text-sm text-slate-400 mt-1">Define physical and logical network constraints prior to IP planning.</p>
        </div>
        <button onClick={openModal} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {activeTab === 'sites' ? 'Site' : activeTab === 'domains' ? 'Domain' : activeTab === 'vlans' ? 'VLAN' : 'Device'}
        </button>
      </div>

      <div className="flex gap-2 p-1.5 bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
        {[
          { id: 'sites', label: 'Physical Sites', icon: Building2 },
          { id: 'domains', label: 'Network Domains (VRF)', icon: Share2 },
          { id: 'vlans', label: 'VLAN Segments', icon: Network },
          { id: 'devices', label: 'Network Devices', icon: Router },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[inset_0_0_15px_rgba(99,102,241,0.15)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl shadow-black/50">
        <table className="w-full text-left text-sm whitespace-nowrap">
           <thead className="bg-white/5 sticky top-0 border-b border-white/10 backdrop-blur-md">
              <tr>
                 {activeTab === 'sites' && (
                    <>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Site Name</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Region</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Site Code</th>
                    </>
                 )}
                 {activeTab === 'domains' && (
                    <>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Domain Name</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">VRF Target</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Description</th>
                    </>
                 )}
                 {activeTab === 'vlans' && (
                    <>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">VLAN ID</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Name</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Bound Site</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Bound Domain</th>
                    </>
                 )}
                 {activeTab === 'devices' && (
                    <>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Hostname</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Role</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Location</th>
                       <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Management IP</th>
                    </>
                 )}
                 <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400 text-right">Created At</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {activeTab === 'sites' && sites.map((s: any) => (
                 <tr key={s.id} className="hover:bg-white/5 transition-colors bg-black/20">
                    <td className="px-8 py-4 font-bold text-white flex items-center gap-3"><Building2 className="w-4 h-4 text-emerald-400"/> {s.name}</td>
                    <td className="px-8 py-4 text-slate-400">{s.region || '-'}</td>
                    <td className="px-8 py-4 text-slate-400 font-mono text-xs">{s.site_code || '-'}</td>
                    <td className="px-8 py-4 text-right text-slate-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                 </tr>
              ))}
              {activeTab === 'domains' && domains.map((d: any) => (
                 <tr key={d.id} className="hover:bg-white/5 transition-colors bg-black/20">
                    <td className="px-8 py-4 font-bold text-white flex items-center gap-3"><Share2 className="w-4 h-4 text-purple-400"/> {d.name}</td>
                    <td className="px-8 py-4 text-slate-400 font-mono text-xs"><span className="bg-white/5 px-2 py-1 rounded text-purple-300">{d.vrf_name || 'GLOBAL'}</span></td>
                    <td className="px-8 py-4 text-slate-400">{d.description || '-'}</td>
                    <td className="px-8 py-4 text-right text-slate-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                 </tr>
              ))}
              {activeTab === 'vlans' && vlans.map((v: any) => {
                 const site = sites.find(s => s.id === v.site_id);
                 const domain = domains.find(d => d.id === v.domain_id);
                 return (
                 <tr key={v.id} className="hover:bg-white/5 transition-colors bg-black/20">
                    <td className="px-8 py-4 font-bold text-white flex items-center gap-3"><Network className="w-4 h-4 text-indigo-400"/> <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md text-xs font-mono border border-indigo-500/30">{v.vlan_id}</span></td>
                    <td className="px-8 py-4 text-slate-300 font-medium">{v.name}</td>
                    <td className="px-8 py-4 text-slate-400">{site ? site.name : 'Global / None'}</td>
                    <td className="px-8 py-4 text-slate-400">{domain ? domain.name : 'Global VRF'}</td>
                    <td className="px-8 py-4 text-right text-slate-500 text-xs">{new Date(v.created_at).toLocaleDateString()}</td>
                 </tr>
              )})}
              {activeTab === 'devices' && devices.map((d: any) => {
                 const site = sites.find(s => s.id === d.site_id);
                 return (
                 <tr key={d.id} className="hover:bg-white/5 transition-colors bg-black/20">
                    <td className="px-8 py-4 font-bold text-white flex items-center gap-3"><Router className="w-4 h-4 text-amber-400"/> {d.hostname}</td>
                    <td className="px-8 py-4 text-slate-400"><span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">{d.role || 'NODE'}</span></td>
                    <td className="px-8 py-4 text-slate-400">{site ? site.name : 'Unknown'}</td>
                    <td className="px-8 py-4 text-slate-400 font-mono text-xs">{d.management_ip || '-'}</td>
                    <td className="px-8 py-4 text-right text-slate-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                 </tr>
              )})}

              {(
                 (activeTab === 'sites' && sites.length === 0) ||
                 (activeTab === 'domains' && domains.length === 0) ||
                 (activeTab === 'vlans' && vlans.length === 0) ||
                 (activeTab === 'devices' && devices.length === 0)
              ) && (
                 <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-slate-500 text-sm">
                       No {activeTab} defined yet. Click "Add" to create one.
                    </td>
                 </tr>
              )}
           </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
           <form onSubmit={handleCreate} className="bg-[#12121a]/95 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-black">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 capitalize">Create New {activeTab.slice(0, -1)}</h3>
                 <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-5 mb-8">
                 {activeTab === 'sites' && (
                    <>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Site Name</label>
                          <input required autoFocus type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Region (Optional)</label>
                          <input type="text" value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Site Code (Optional)</label>
                          <input type="text" value={formData.siteCode || ''} onChange={e => setFormData({...formData, siteCode: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                    </>
                 )}
                 {activeTab === 'domains' && (
                    <>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Domain Name</label>
                          <input required autoFocus type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">VRF Target / Identifier</label>
                          <input type="text" value={formData.vrfName || ''} onChange={e => setFormData({...formData, vrfName: e.target.value})} placeholder="e.g. vrf-oam" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono text-sm" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Description</label>
                          <input type="text" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                    </>
                 )}
                 {activeTab === 'vlans' && (
                    <>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">VLAN ID (Tag)</label>
                          <input required autoFocus type="number" min="1" max="4094" value={formData.vlanId || ''} onChange={e => setFormData({...formData, vlanId: e.target.value})} placeholder="e.g. 100" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">VLAN Name / Purpose</label>
                          <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. IPRAN Management" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Target Site (Optional)</label>
                          <select value={formData.siteId || ''} onChange={e => setFormData({...formData, siteId: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                             <option value="">Global / No Specific Site</option>
                             {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Target VRF / Domain (Optional)</label>
                          <select value={formData.domainId || ''} onChange={e => setFormData({...formData, domainId: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                             <option value="">Global Domain</option>
                             {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                       </div>
                    </>
                 )}
                 {activeTab === 'devices' && (
                    <>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Hostname</label>
                          <input required autoFocus type="text" value={formData.hostname || ''} onChange={e => setFormData({...formData, hostname: e.target.value})} placeholder="e.g. core-rtr-01" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono" />
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Device Role</label>
                          <select required value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                             <option value="" disabled>Select Role...</option>
                             <option value="CORE_ROUTER">Core Router</option>
                             <option value="EDGE_ROUTER">Edge Router</option>
                             <option value="AGG_SWITCH">Aggregation Switch</option>
                             <option value="ACCESS_SWITCH">Access Switch</option>
                             <option value="FIREWALL">Firewall</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Target Site</label>
                          <select value={formData.siteId || ''} onChange={e => setFormData({...formData, siteId: e.target.value})} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                             <option value="">Unknown Location</option>
                             {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Management IP</label>
                          <input type="text" value={formData.managementIp || ''} onChange={e => setFormData({...formData, managementIp: e.target.value})} placeholder="e.g. 10.255.0.1" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-mono" />
                       </div>
                    </>
                 )}
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5">Submit</button>
           </form>
        </div>
      )}
    </div>
  );
}
