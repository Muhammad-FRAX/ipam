import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, XCircle, AlertTriangle, PlusCircle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../components/Skeleton';

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadRequests = async () => {
    try {
      const res = await axios.get('/api/workflow/requests');
      setRequests(res.data?.items ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await axios.put('/api/workflow/requests/' + id + '/' + action);
      loadRequests();
    } catch (err) {
      alert('Failed to ' + action + ' request');
    }
  };

  const handleExport = () => {
    window.open(`/api/insight/export/request?format=csv&id=all`, '_blank');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'APPROVED':  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'REJECTED':  return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
      case 'FAILED':    return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:          return 'bg-slate-800 text-slate-500 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">Request Approval Queue</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm border border-slate-700 transition"
          >
            Export Queue
          </button>
          <button
            onClick={() => navigate('/requests/new')}
            className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-lg text-sm font-medium transition"
          >
            <PlusCircle className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} className="h-48" />)}
        {!loading && requests.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
              <ShieldAlert className="w-10 h-10 text-blue-500/60" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No pending requests</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              The approval queue is clear. New subnet and IP requests submitted by users will appear here.
            </p>
            <button
              onClick={() => navigate('/requests/new')}
              className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-5 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <PlusCircle className="w-4 h-4" /> Submit a Request
            </button>
          </div>
        )}

        {!loading && requests.map((req: any) => (
          <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                {req.type}
              </span>
              <span className={"text-xs font-semibold px-2 py-1 rounded-md border " + getStatusStyle(req.status)}>
                {req.status}
              </span>
            </div>

            <h3 className="text-lg font-mono text-white mb-1">{req.requested_cidr || 'Dynamic IP Assignment'}</h3>
            <p className="text-sm text-slate-400 mb-4 flex-1">
              Requested by <span className="text-slate-300">{req.submitter_email || req.submitted_by}</span>
              {' '}on {new Date(req.created_at).toLocaleDateString()}
            </p>

            {req.status === 'FAILED' && req.failure_reason && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{req.failure_reason}</span>
              </div>
            )}

            <button
              onClick={() => window.location.href = `/planning-360/request/${req.id}`}
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 py-1.5 rounded-lg text-xs font-medium transition mb-4"
            >
              Open 360 Insight
            </button>

            {req.status === 'SUBMITTED' && (
              <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-auto">
                <button
                  onClick={() => handleAction(req.id, 'reject')}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-slate-400" /> Reject
                </button>
                <button
                  onClick={() => handleAction(req.id, 'approve')}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
