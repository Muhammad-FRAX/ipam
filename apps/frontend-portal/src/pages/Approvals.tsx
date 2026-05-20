import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Approvals() {
  const [requests, setRequests] = useState([]);

  const loadRequests = async () => {
    try {
      const res = await axios.get('/api/workflow/requests');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await axios.put('/api/workflow/requests/' + id + '/' + action);
      loadRequests();
    } catch(err) {
      alert('Failed to ' + action + ' request');
    }
  };

  const handleExport = () => {
    window.open(`/api/insight/export/request?format=csv&id=all`, '_blank');
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
         <h2 className="text-xl font-bold text-white">Request Approval Queue</h2>
         <button onClick={handleExport} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm border border-slate-700 transition">
            Export Queue
         </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {requests.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
               No pending requests in the queue.
            </div>
         )}
         
         {requests.map((req: any) => {
           let statusClass = 'bg-slate-800 text-slate-500 border-slate-700';
           if (req.status === 'SUBMITTED') statusClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
           if (req.status === 'APPROVED') statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

           return (
           <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                 <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                   {req.type}
                 </span>
                 <span className={"text-xs font-semibold px-2 py-1 rounded-md border " + statusClass}>
                   {req.status}
                 </span>
              </div>
              
              <h3 className="text-lg font-mono text-white mb-1">{req.requested_cidr || 'Dynamic IP Assignment'}</h3>
              <p className="text-sm text-slate-400 mb-4 flex-1">Requested by <span className="text-slate-300">{req.submitter_email || req.submitted_by}</span> on {new Date(req.created_at).toLocaleDateString()}</p>
              
              <button onClick={() => window.location.href = `/planning-360/request/${req.id}`} className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 py-1.5 rounded-lg text-xs font-medium transition mb-4">
                 Open 360 Insight
              </button>
              
              {req.status === 'SUBMITTED' && (
                <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-auto">
                   <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                     <XCircle className="w-4 h-4 text-slate-400" /> Reject
                   </button>
                   <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2">
                     <CheckCircle2 className="w-4 h-4" /> Approve
                   </button>
                </div>
              )}
           </div>
           )
         })}
      </div>
    </div>
  );
}
