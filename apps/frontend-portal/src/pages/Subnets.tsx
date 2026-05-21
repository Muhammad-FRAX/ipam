import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, FolderTree, X, Download, Trash2, AlertCircle, Network, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';

const subnetCapacity = (cidr: string): number => {
  const prefix = parseInt(cidr?.split('/')[1] ?? '32', 10);
  if (isNaN(prefix)) return 0;
  if (prefix >= 31) return Math.pow(2, 32 - prefix);
  return Math.pow(2, 32 - prefix) - 2;
};

export default function Subnets() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [subnets, setSubnets] = useState<any[]>([]);
  const [orgStructure, setOrgStructure] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [vlans, setVlans] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockCidr, setBlockCidr] = useState('');
  const [blockDomainId, setBlockDomainId] = useState('');

  const [showSubnetModal, setShowSubnetModal] = useState(false);
  const [subnetBlockId, setSubnetBlockId] = useState('');
  const [subnetParentId, setSubnetParentId] = useState('');
  const [subnetName, setSubnetName] = useState('');
  const [subnetCidr, setSubnetCidr] = useState('');
  const [subnetDomainId, setSubnetDomainId] = useState('');
  const [subnetVlanId, setSubnetVlanId] = useState('');
  const [subnetServiceType, setSubnetServiceType] = useState('');

  // Telecom Metadata Fields
  const [subnetIpRangeType, setSubnetIpRangeType] = useState('');
  const [subnetServiceEndIf, setSubnetServiceEndIf] = useState('');
  const [subnetGatewayEndIf, setSubnetGatewayEndIf] = useState('');
  const [subnetVlanType, setSubnetVlanType] = useState('');
  const [subnetConnectedElements, setSubnetConnectedElements] = useState('');
  const [subnetRequestDate, setSubnetRequestDate] = useState('');
  const [subnetRequesterName, setSubnetRequesterName] = useState('');
  const [subnetRequesterDepartment, setSubnetRequesterDepartment] = useState('');
  const [subnetSpoc, setSubnetSpoc] = useState('');

  const [showIpModal, setShowIpModal] = useState(false);
  const [ipSubnetId, setIpSubnetId] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [ipNodeDetails, setIpNodeDetails] = useState('');
  const [ipDivision, setIpDivision] = useState('');
  const [ipDepartment, setIpDepartment] = useState('');
  const [ipDeviceId, setIpDeviceId] = useState('');
  const [ipIsGateway, setIpIsGateway] = useState(false);

  // Task 6.6: search, expand/collapse, IP counts, inline release
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [expandedSubnetIds, setExpandedSubnetIds] = useState<Set<string>>(new Set());
  const [subnetIpData, setSubnetIpData] = useState<Record<string, { ips: any[]; loading: boolean }>>({});
  const [ipCounts, setIpCounts] = useState<Record<string, number>>({});
  
  const loadTopology = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [bRes, sRes, cRes, domRes, vlanRes, siteRes, devRes, ipRes] = await Promise.all([
        axios.get('/api/ipam/blocks'),
        axios.get('/api/ipam/subnets'),
        axios.get('/api/config/'),
        axios.get('/api/ipam/domains').catch(() => ({ data: [] })),
        axios.get('/api/ipam/vlans').catch(() => ({ data: [] })),
        axios.get('/api/ipam/sites').catch(() => ({ data: [] })),
        axios.get('/api/ipam/devices').catch(() => ({ data: [] })),
        axios.get('/api/ipam/ips').catch(() => ({ data: [] }))
      ]);
      const fetchedBlocks = bRes.data?.items ?? [];
      setBlocks(fetchedBlocks);
      setSubnets(sRes.data?.items ?? []);
      setDomains(domRes.data?.items ?? []);
      setVlans(vlanRes.data?.items ?? []);
      setSites(siteRes.data?.items ?? []);
      setDevices(devRes.data?.items ?? []);

      // Initialize all blocks as expanded
      setExpandedBlocks(new Set(fetchedBlocks.map((b: any) => b.id)));

      // Compute IP counts per subnet
      const ips: any[] = ipRes.data?.items ?? ipRes.data ?? [];
      const counts: Record<string, number> = {};
      ips.forEach((ip: any) => {
        if (ip.subnet_id && ip.status === 'ALLOCATED') {
          counts[ip.subnet_id] = (counts[ip.subnet_id] ?? 0) + 1;
        }
      });
      setIpCounts(counts);

      const conf = cRes.data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
      if (conf.org_structure) {
          setOrgStructure(Array.isArray(conf.org_structure) ? conf.org_structure : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = (id: string) =>
    setExpandedBlocks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSubnetIps = async (subnetId: string) => {
    setExpandedSubnetIds(prev => {
      const n = new Set(prev);
      if (n.has(subnetId)) { n.delete(subnetId); return n; }
      n.add(subnetId);
      return n;
    });
    if (!subnetIpData[subnetId]) {
      setSubnetIpData(prev => ({ ...prev, [subnetId]: { ips: [], loading: true } }));
      try {
        const res = await axios.get(`/api/ipam/ips?subnetId=${subnetId}`);
        const ips = res.data?.items ?? res.data ?? [];
        setSubnetIpData(prev => ({ ...prev, [subnetId]: { ips, loading: false } }));
      } catch {
        setSubnetIpData(prev => ({ ...prev, [subnetId]: { ips: [], loading: false } }));
      }
    }
  };

  const handleReleaseIp = async (ipId: string, subnetId: string) => {
    if (!window.confirm('Release this IP address?')) return;
    try {
      await axios.put(`/api/ipam/ips/${ipId}/release`);
      setIpCounts(prev => ({ ...prev, [subnetId]: Math.max(0, (prev[subnetId] ?? 1) - 1) }));
      setSubnetIpData(prev => ({
        ...prev,
        [subnetId]: { ...prev[subnetId], ips: prev[subnetId]?.ips.filter(ip => ip.id !== ipId) ?? [] }
      }));
    } catch {
      alert('Failed to release IP');
    }
  };

  const matchesTerm = (v: string) => !searchTerm || (v ?? '').toLowerCase().includes(searchTerm.toLowerCase());
  const blockVisible = (b: any) =>
    !searchTerm ||
    matchesTerm(b.name) ||
    matchesTerm(b.cidr) ||
    subnets.some(s => s.block_id === b.id && (matchesTerm(s.name) || matchesTerm(s.cidr)));
  const subnetVisible = (s: any) => !searchTerm || matchesTerm(s.name) || matchesTerm(s.cidr);

  useEffect(() => {
    loadTopology(true);
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/ipam/blocks', { name: blockName, cidr: blockCidr, domainId: blockDomainId || undefined });
      setShowBlockModal(false);
      setBlockName('');
      setBlockCidr('');
      setBlockDomainId('');
      loadTopology();
    } catch (err) {
      alert('Failed to create block. Verify CIDR syntax.');
    }
  };

  const handleCreateSubnet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!subnetBlockId) {
          alert('Block must be selected');
          return;
      }
      await axios.post('/api/ipam/subnets', { 
         blockId: subnetBlockId, 
         parentSubnetId: subnetParentId || undefined, 
         name: subnetName, 
         cidr: subnetCidr,
         domainId: subnetDomainId || undefined,
         vlanId: subnetVlanId || undefined,
         serviceType: subnetServiceType || undefined,
         ipRangeType: subnetIpRangeType || undefined,
         serviceEndIf: subnetServiceEndIf || undefined,
         gatewayEndIf: subnetGatewayEndIf || undefined,
         vlanType: subnetVlanType || undefined,
         connectedElements: subnetConnectedElements || undefined,
         requestDate: subnetRequestDate || undefined,
         requesterName: subnetRequesterName || undefined,
         requesterDepartment: subnetRequesterDepartment || undefined,
         spoc: subnetSpoc || undefined
      });
      setShowSubnetModal(false);
      setSubnetName('');
      setSubnetCidr('');
      setSubnetParentId('');
      setSubnetDomainId('');
      setSubnetVlanId('');
      setSubnetServiceType('');
      setSubnetIpRangeType('');
      setSubnetServiceEndIf('');
      setSubnetGatewayEndIf('');
      setSubnetVlanType('');
      setSubnetConnectedElements('');
      setSubnetRequestDate('');
      setSubnetRequesterName('');
      setSubnetRequesterDepartment('');
      setSubnetSpoc('');
      loadTopology();
    } catch (err) {
      alert('Failed to allocate subnet. Verify CIDR syntax and overlap.');
    }
  };

  const handleDeleteBlock = async (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to delete Root Block ${name}? This will cascade delete all nested subnets.`)) {
          try {
              await axios.post(`/api/ipam/blocks/${id}/delete`);
              loadTopology();
          } catch(e) { alert('Failed to delete block'); }
      }
  };

  const handleDeleteSubnet = async (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to delete Subnet ${name}? This will affect all nested subnets.`)) {
          try {
              await axios.post(`/api/ipam/subnets/${id}/delete`);
              loadTopology();
          } catch(e) { alert('Failed to delete subnet'); }
      }
  };

  const handleAssignIp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await axios.post('/api/ipam/ips', {
            subnetId: ipSubnetId,
            ipAddress,
            deviceId: ipDeviceId || undefined,
            isGateway: ipIsGateway,
            metadata: {
                nodeDetails: ipNodeDetails,
                division: ipDivision,
                department: ipDepartment
            }
        });
        setShowIpModal(false);
        setIpAddress('');
        setIpNodeDetails('');
        setIpDivision('');
        setIpDepartment('');
        setIpDeviceId('');
        setIpIsGateway(false);
        alert('IP successfully assigned to node!');
    } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to assign IP Address.';
        alert(msg);
    }
  };

  const renderSubnetRecursive = (blockId: string, parentNodeId: string | null, depth: number, isLastChildArr: boolean[]) => {
    const children = subnets.filter(
      s => s.block_id === blockId &&
      (s.parent_subnet_id === parentNodeId || (!s.parent_subnet_id && parentNodeId === null)) &&
      subnetVisible(s)
    );

    return children.sort((a, b) => a.name.localeCompare(b.name)).flatMap((s, index) => {
       const isLastChild = index === children.length - 1;
       const nextLevelLastChildArr = [...isLastChildArr, isLastChild];
       const capacity = subnetCapacity(s.cidr);
       const allocated = ipCounts[s.id] ?? 0;
       const utilPct = capacity > 0 ? Math.round((allocated / capacity) * 100) : 0;
       const utilColor =
         utilPct >= 80 ? 'text-red-400' :
         utilPct >= 60 ? 'text-amber-400' : 'text-emerald-400';

       const statusClass = s.status === 'AVAILABLE'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

       const prefixParts: React.ReactNode[] = [];
       for (let i = 0; i < depth; i++) {
          prefixParts.push(
            <span key={i} className={`inline-block w-5 font-mono font-bold ${isLastChildArr[i] ? 'text-transparent' : 'text-slate-700'}`}>│</span>
          );
       }
       prefixParts.push(
         <span key="branch" className="text-slate-600 inline-block w-5 font-mono font-bold">
           {isLastChild ? '└─' : '├─'}
         </span>
       );

       const isIpsExpanded = expandedSubnetIds.has(s.id);
       const ipData = subnetIpData[s.id];

       const rows: React.ReactNode[] = [
         <tr key={s.id} className="hover:bg-slate-800/60 transition-colors">
           <td className="px-4 py-3 flex items-center font-mono text-[13px] pl-6 whitespace-pre">
             {prefixParts}
             <button
               onClick={() => toggleSubnetIps(s.id)}
               className="p-0.5 ml-1 text-slate-600 hover:text-slate-400 transition-colors shrink-0"
               title={isIpsExpanded ? 'Hide IPs' : 'Show IPs'}
             >
               {isIpsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
             </button>
             <span className="text-slate-300 ml-1 font-sans font-medium truncate">{s.name}</span>
           </td>
           <td className="px-6 py-3 text-purple-400 font-mono text-xs">{s.cidr}</td>
           <td className="px-6 py-3">
             <span className={`font-mono text-xs font-semibold ${utilColor}`}>
               {allocated} / {capacity > 0 ? capacity.toLocaleString() : '—'}
               {capacity > 0 && <span className="text-slate-500 ml-1">({utilPct}%)</span>}
             </span>
           </td>
           <td className="px-6 py-3">
             <span className={"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border " + statusClass}>
               {s.status}
             </span>
           </td>
           <td className="px-6 py-3 text-right">
             <div className="flex items-center justify-end gap-3">
               <button onClick={() => { setIpSubnetId(s.id); setShowIpModal(true); }} className="text-emerald-400 hover:text-emerald-300 text-[13px] font-medium transition whitespace-nowrap">Assign IP</button>
               <button onClick={() => window.location.href = `/planning-360/subnet/${s.id}`} className="text-indigo-400 hover:text-indigo-300 text-[13px] font-medium transition whitespace-nowrap">360 View</button>
               <button onClick={() => handleDeleteSubnet(s.id, s.name)} className="text-red-500 hover:text-red-400 p-0.5 opacity-50 hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
           </td>
         </tr>
       ];

       // Inline IP list
       if (isIpsExpanded) {
         rows.push(
           <tr key={`ips-${s.id}`} className="bg-black/30">
             <td colSpan={5} className="px-12 py-3">
               {ipData?.loading && (
                 <div className="text-xs text-slate-500 animate-pulse py-2">Loading IPs…</div>
               )}
               {ipData && !ipData.loading && ipData.ips.length === 0 && (
                 <div className="text-xs text-slate-600 py-2">No allocated IPs in this subnet.</div>
               )}
               {ipData && !ipData.loading && ipData.ips.length > 0 && (
                 <div className="flex flex-wrap gap-2 py-1">
                   {ipData.ips.filter((ip: any) => ip.status === 'ALLOCATED').map((ip: any) => (
                     <div key={ip.id} className="flex items-center gap-2 bg-slate-800/80 border border-white/5 rounded-lg px-3 py-1.5 text-xs group/ip">
                       <span className="font-mono text-emerald-400">{ip.ip_address}</span>
                       {ip.metadata?.nodeDetails && (
                         <span className="text-slate-400 max-w-[120px] truncate">{ip.metadata.nodeDetails}</span>
                       )}
                       <button
                         onClick={() => handleReleaseIp(ip.id, s.id)}
                         className="text-red-500/50 hover:text-red-400 transition-colors ml-1 opacity-0 group-hover/ip:opacity-100"
                         title="Release IP"
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
             </td>
           </tr>
         );
       }

       const subChildren = renderSubnetRecursive(blockId, s.id, depth + 1, nextLevelLastChildArr);
       return [...rows, ...subChildren];
    });
  };

  const handleExport = (format: string) => {
    window.open(`/api/insight/export/full-system?format=${format}`, '_blank');
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">IP Topology Management</h2>
        <div className="flex gap-3">
           <button onClick={() => handleExport('csv')} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 flex items-center gap-2 rounded-lg text-sm font-medium border border-slate-700 transition">
              <Download className="w-4 h-4"/> Export Topology
           </button>
           <button onClick={() => setShowBlockModal(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 transition">
              + New Block
           </button>
           <button onClick={() => setShowSubnetModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition flex items-center gap-2">
              <Plus className="w-4 h-4" /> Allocate Subnet
           </button>
        </div>
      </div>

      <div className="flex gap-4">
         <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg flex items-center px-4 py-2 text-slate-400 focus-within:border-indigo-500 focus-within:text-indigo-400 transition-colors">
            <Search className="w-5 h-5 mr-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or CIDR..."
              className="bg-transparent border-none outline-none w-full text-slate-200 placeholder-slate-600 text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="ml-2 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
         </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#12121a]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl shadow-black/50 hover:border-white/10 transition-colors">
         <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 sticky top-0 border-b border-white/10 backdrop-blur-md">
               <tr>
                  <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Name / Context</th>
                  <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">CIDR Range</th>
                  <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">IP Usage</th>
                  <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400">Status</th>
                  <th className="px-8 py-5 font-bold tracking-widest text-[11px] uppercase text-slate-400 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {loading && <tr><td colSpan={5} className="p-0"><SkeletonTable rows={6} cols={5} /></td></tr>}
               {!loading && blocks.filter(blockVisible).map((b: any) => (
                  <React.Fragment key={'frag-'+b.id}>
                     <tr key={b.id} className="hover:bg-white/5 transition-colors bg-black/20 border-b border-t border-white/5">
                        <td className="px-4 py-4 flex items-center gap-2">
                           <button
                             onClick={() => toggleBlock(b.id)}
                             className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                             title={expandedBlocks.has(b.id) ? 'Collapse block' : 'Expand block'}
                           >
                             {expandedBlocks.has(b.id)
                               ? <ChevronDown className="w-4 h-4" />
                               : <ChevronRightIcon className="w-4 h-4" />}
                           </button>
                           <FolderTree className="w-5 h-5 text-indigo-400 shrink-0" />
                           <span className="font-bold text-white tracking-wide text-[15px]">{b.cidr}</span>
                           <span className="text-slate-400 text-[14px] ml-1">- {b.name}</span>
                        </td>
                        <td className="px-8 py-4 text-slate-500 font-mono text-xs">-</td>
                        <td className="px-8 py-4"><span className="text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]">Root Block</span></td>
                        <td className="px-8 py-4">
                           <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              {b.status}
                           </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                           <div className="flex items-center justify-end gap-4">
                              <button onClick={() => window.location.href = `/planning-360/pool/${b.id}`} className="text-slate-400 hover:text-white font-semibold text-sm transition">360 View</button>
                              <button onClick={() => handleDeleteBlock(b.id, b.name)} className="text-red-500/70 hover:text-red-400 p-0.5 transition"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </td>
                     </tr>
                     {expandedBlocks.has(b.id) && renderSubnetRecursive(b.id, null, 0, [])}
                  </React.Fragment>
               ))}
               
               {!loading && blocks.length === 0 && (
                 <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                          <Network className="w-10 h-10 text-indigo-500/60" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">No root blocks yet</h3>
                        <p className="text-sm text-slate-500 max-w-sm mb-6">
                          Start by defining the IP space you own. A root block like <span className="font-mono text-indigo-400">10.0.0.0/8</span> anchors your entire allocation tree.
                        </p>
                        <button
                          onClick={() => setShowBlockModal(true)}
                          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                        >
                          <Plus className="w-4 h-4" /> Create Your First Block
                        </button>
                      </div>
                    </td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
           <form onSubmit={handleCreateBlock} className="bg-[#12121a]/95 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl shadow-black">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Create Root Block</h3>
                 <button type="button" onClick={() => setShowBlockModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-5 mb-8">
                 <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Block Name</label>
                    <input autoFocus required type="text" value={blockName} onChange={e => setBlockName(e.target.value)} placeholder="e.g. Corporate WAN" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">CIDR Range</label>
                    <input required type="text" value={blockCidr} onChange={e => setBlockCidr(e.target.value)} placeholder="e.g. 10.0.0.0/8" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Network Domain (Optional)</label>
                    <select value={blockDomainId} onChange={e => setBlockDomainId(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                       <option value="">None</option>
                       {domains.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name} (VRF: {d.vrf_name})</option>
                       ))}
                    </select>
                 </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5">Create Block</button>
           </form>
        </div>
      )}

      {/* Subnet Modal */}
      {showSubnetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
           <form onSubmit={handleCreateSubnet} className="bg-[#12121a]/95 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl shadow-black max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Allocate Subnet</h3>
                 <button type="button" onClick={() => setShowSubnetModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                 <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Parent Block</label>
                    <select required value={subnetBlockId} onChange={e => { setSubnetBlockId(e.target.value); setSubnetParentId(''); }} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                       <option value="" disabled>Select a root block...</option>
                       {blocks.map((b: any) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.cidr})</option>
                       ))}
                    </select>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Parent Subnet (Optional)</label>
                    <select disabled={!subnetBlockId} value={subnetParentId} onChange={e => setSubnetParentId(e.target.value)} className={"w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none " + (subnetBlockId ? "text-white" : "text-slate-600")}>
                       <option value="">None (Top-Level Region)</option>
                       {subnets.filter(s => s.block_id === subnetBlockId).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.cidr})</option>
                       ))}
                    </select>
                 </div>
                 <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Subnet Name</label>
                    <input required type="text" value={subnetName} onChange={e => setSubnetName(e.target.value)} placeholder="e.g. Core Network" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                 </div>
                 <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">CIDR Range</label>
                    <input required type="text" value={subnetCidr} onChange={e => setSubnetCidr(e.target.value)} placeholder="e.g. 10.1.0.0/16" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                 </div>
                 
                 <div className="col-span-2 border-t border-white/5 pt-6 mt-2">
                     <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Telecom Data & Planning Context</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Network Domain (VRF)</label>
                           <select value={subnetDomainId} onChange={e => setSubnetDomainId(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                              <option value="">None (Global)</option>
                              {domains.map((d: any) => (
                                 <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                           </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">VLAN Segments</label>
                           <select value={subnetVlanId} onChange={e => setSubnetVlanId(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                              <option value="">None</option>
                              {vlans.map((v: any) => (
                                 <option key={v.id} value={v.id}>VLAN {v.vlan_id} - {v.name}</option>
                              ))}
                           </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">IP Range Type</label>
                           <select value={subnetIpRangeType} onChange={e => setSubnetIpRangeType(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                              <option value="">Select Type</option>
                              <option value="Private IP">Private IP</option>
                              <option value="Public IP">Public IP</option>
                           </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">VLAN Type</label>
                           <select value={subnetVlanType} onChange={e => setSubnetVlanType(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none">
                              <option value="">Select VLAN Type</option>
                              <option value="Normal VLAN(SW)">Normal VLAN(SW)</option>
                              <option value="Sub-interface">Sub-interface</option>
                              <option value="Vlanif">Vlanif</option>
                           </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Service End IF</label>
                           <input type="text" value={subnetServiceEndIf} onChange={e => setSubnetServiceEndIf(e.target.value)} placeholder="e.g. Eth0/1" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Gateway End IF</label>
                           <input type="text" value={subnetGatewayEndIf} onChange={e => setSubnetGatewayEndIf(e.target.value)} placeholder="e.g. Vlanif100" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Network Elements Connected</label>
                           <textarea rows={2} value={subnetConnectedElements} onChange={e => setSubnetConnectedElements(e.target.value)} placeholder="List down all NE connected to this VLAN" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"></textarea>
                        </div>
                     </div>
                 </div>
                 
                 <div className="col-span-2 border-t border-white/5 pt-6 mt-2">
                     <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Requester Context</h4>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Requester Name</label>
                           <input type="text" value={subnetRequesterName} onChange={e => setSubnetRequesterName(e.target.value)} placeholder="Name" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Department</label>
                           <input type="text" value={subnetRequesterDepartment} onChange={e => setSubnetRequesterDepartment(e.target.value)} placeholder="Dept" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Request Date</label>
                           <input type="date" value={subnetRequestDate} onChange={e => setSubnetRequestDate(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                           <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">SPOC</label>
                           <input type="text" value={subnetSpoc} onChange={e => setSubnetSpoc(e.target.value)} placeholder="Point of Contact" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                     </div>
                 </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5">Allocate Subnet</button>
           </form>
        </div>
      )}

      {/* Assign IP Modal */}
      {showIpModal && (() => {
         const targetSubnet = subnets.find(s => s.id === ipSubnetId);
         const subnetCidr = targetSubnet?.cidr || '';
         
         // Compute valid IP range from CIDR for display hint
         const computeRange = (cidr: string) => {
             if (!cidr) return { start: '', end: '' };
             const [network, prefixStr] = cidr.split('/');
             const prefix = parseInt(prefixStr, 10);
             if (isNaN(prefix)) return { start: '', end: '' };
             const parts = network.split('.').map(Number);
             const ipLong = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
             const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
             const netStart = (ipLong & mask) >>> 0;
             const netEnd = (netStart | (~mask >>> 0)) >>> 0;
             const toIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
             return { start: toIp(netStart), end: toIp(netEnd) };
         };
         const range = computeRange(subnetCidr);

         // Get available departments for selected division
         const selectedDivData = orgStructure.find((o: any) => o.division === ipDivision);
         const departments: string[] = selectedDivData?.departments || [];

         return (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <form onSubmit={handleAssignIp} className="bg-[#12121a]/95 border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-2xl shadow-black max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Assign IP to Node</h3>
                  <button type="button" onClick={() => setShowIpModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
               </div>
               <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="col-span-2">
                     <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Target Subnet</label>
                     <input disabled value={targetSubnet ? `${targetSubnet.name} (${targetSubnet.cidr})` : ipSubnetId} className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-slate-500 font-mono focus:outline-none" />
                     {range.start && (
                        <p className="text-xs text-slate-500 mt-2 font-mono ml-2">
                           Valid range: <span className="text-indigo-400">{range.start}</span> — <span className="text-indigo-400">{range.end}</span>
                        </p>
                     )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                     <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">IP Address</label>
                     <input required type="text" value={ipAddress} onChange={e => setIpAddress(e.target.value)} placeholder={range.start ? `e.g. ${range.start.replace(/\.0$/, '.10')}` : 'e.g. 10.1.0.24'} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                     <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Device / Node</label>
                     <select value={ipDeviceId} onChange={e => setIpDeviceId(e.target.value)} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                        <option value="">None / Custom Node</option>
                        {devices.map((d: any) => (
                           <option key={d.id} value={d.id}>{d.hostname} ({d.role})</option>
                        ))}
                     </select>
                  </div>
                  <div className="col-span-2">
                     <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Node Details / Description</label>
                     <input required type="text" value={ipNodeDetails} onChange={e => setIpNodeDetails(e.target.value)} placeholder="e.g. Primary DB Cluster Node 1" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  </div>

                  <div className="col-span-2 flex items-center mt-2">
                     <input type="checkbox" id="isGateway" checked={ipIsGateway} onChange={e => setIpIsGateway(e.target.checked)} className="w-4 h-4 text-indigo-500 border-white/10 rounded focus:ring-indigo-500 bg-black/50 accent-indigo-500" />
                     <label htmlFor="isGateway" className="ml-2 block text-sm text-slate-300 font-medium">Mark as Gateway IP</label>
                  </div>

                  {orgStructure.length === 0 ? (
                     <div className="col-span-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-4">
                        <p className="text-amber-400 text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4"/> No divisions configured</p>
                        <p className="text-amber-400/70 text-xs mt-2 font-medium">Go to <a href="/config" className="underline hover:text-amber-300">Configuration → Organizational Map</a> to add divisions and departments first.</p>
                     </div>
                  ) : (
                  <div className="col-span-2 grid grid-cols-2 gap-6 border-t border-white/5 pt-6 mt-4">
                     <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Owner Division</label>
                        <select required value={ipDivision} onChange={e => { setIpDivision(e.target.value); setIpDepartment(''); }} className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none">
                           <option value="" disabled>Select Division...</option>
                           {orgStructure.map((org: any, i: number) => (
                              <option key={i} value={org.division}>{org.division}</option>
                           ))}
                        </select>
                     </div>
                     <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">Owner Department</label>
                        <select required value={ipDepartment} onChange={e => setIpDepartment(e.target.value)} disabled={!ipDivision} className={"w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none " + (ipDivision ? 'text-white' : 'text-slate-600 cursor-not-allowed')}>
                           <option value="" disabled>{ipDivision ? 'Select Department...' : 'Select a division first...'}</option>
                           {departments.map((dep: string, i: number) => (
                              <option key={i} value={dep}>{dep}</option>
                           ))}
                        </select>
                     </div>
                  </div>
                  )}
               </div>
               <button type="submit" disabled={orgStructure.length === 0} className={"w-full py-3.5 rounded-xl font-bold tracking-wide shadow-lg transition-all " + (orgStructure.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5')}>Assign IP Address</button>
            </form>
         </div>
         );
      })()}
    </div>
  );
}
