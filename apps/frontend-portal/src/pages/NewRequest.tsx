import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PlusCircle, ChevronLeft, AlertCircle } from 'lucide-react';

export default function NewRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<any[]>([]);
  const [type, setType] = useState<'SUBNET' | 'IP'>('SUBNET');
  const [requestedCidr, setRequestedCidr] = useState('');
  const [blockId, setBlockId] = useState('');
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/ipam/blocks').then(res => setBlocks(res.data?.items ?? [])).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSubmitting(true);
    try {
      await axios.post('/api/workflow/requests', {
        type,
        requestedCidr,
        blockId: blockId || null,
        metadata: { name: name || requestedCidr, serviceType: serviceType || null },
        submittedBy: user.userId,
      });
      navigate('/approvals');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/approvals')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">New Allocation Request</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6 shadow-xl"
      >
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Request Type</label>
          <div className="grid grid-cols-2 gap-3">
            {(['SUBNET', 'IP'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  type === t
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {t === 'SUBNET' ? 'Subnet Allocation' : 'IP Address'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            {type === 'SUBNET' ? 'Requested CIDR' : 'Requested IP Address'}
          </label>
          <input
            type="text"
            required
            value={requestedCidr}
            onChange={e => setRequestedCidr(e.target.value)}
            placeholder={type === 'SUBNET' ? '10.5.0.0/24' : '10.5.0.5'}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">
            {type === 'SUBNET' ? 'Parent Block' : 'Target Subnet'}
          </label>
          <select
            value={blockId}
            onChange={e => setBlockId(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          >
            <option value="">Select {type === 'SUBNET' ? 'a block' : 'a subnet'}…</option>
            {blocks.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name} ({b.cidr})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Name <span className="text-slate-500">(optional)</span></label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Core IPRAN subnet"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Service Type <span className="text-slate-500">(optional)</span></label>
          <input
            type="text"
            value={serviceType}
            onChange={e => setServiceType(e.target.value)}
            placeholder="e.g. IPRAN, MPBN"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle className="w-4 h-4" />
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
