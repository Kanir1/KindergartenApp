// src/pages/ReportsList.jsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import ReportCard from '../components/ReportCard';

export default function ReportsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState('daily');   // 'daily' | 'monthly'
  const [child, setChild] = useState('ALL'); // 'ALL' or childId
  const [type, setType] = useState('');      // '', 'pre', 'post' (daily only)
  const [from, setFrom] = useState('');      // YYYY-MM-DD (daily only)
  const [to, setTo] = useState('');          // YYYY-MM-DD (daily only)
  const [month, setMonth] = useState('');    // YYYY-MM (monthly only)

  // Load children based on role
  const childrenQuery = useQuery({
    queryKey: ['children', user?.role],
    queryFn: async () => {
      const path = isAdmin ? '/children' : '/children/mine';
      return (await api.get(path)).data || [];
    },
  });

  // Build query strings
  const dailyParams = useMemo(() => {
    const p = new URLSearchParams();
    if (child && child !== 'ALL') p.set('child', child);
    if (type) p.set('type', type); // backend accepts 'pre'/'post' and maps
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [child, type, from, to]);

  const monthlyParams = useMemo(() => {
    const p = new URLSearchParams();
    if (child && child !== 'ALL') p.set('child', child);
    if (month) p.set('month', month);
    return p.toString();
  }, [child, month]);

  const dailyQuery = useQuery({
    enabled: tab === 'daily',
    queryKey: ['daily', dailyParams],
    queryFn: async () => {
      const qs = dailyParams ? `?${dailyParams}` : '';
      return (await api.get(`/daily${qs}`)).data || [];
    },
  });

  const monthlyQuery = useQuery({
    enabled: tab === 'monthly',
    queryKey: ['monthly', monthlyParams],
    queryFn: async () => {
      const qs = monthlyParams ? `?${monthlyParams}` : '';
      return (await api.get(`/monthly${qs}`)).data || [];
    },
  });

  const data = tab === 'daily' ? dailyQuery.data : monthlyQuery.data;
  const loading = tab === 'daily' ? dailyQuery.isLoading : monthlyQuery.isLoading;

  // Quick date presets
  const setToday = () => {
    const now = new Date();
    const ymd = now.toISOString().slice(0, 10);
    setFrom(ymd);
    setTo(ymd);
  };

  const setThisWeek = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6); // last 7 days including today
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex border rounded overflow-hidden">
          <button
            className={`px-3 py-1 ${tab === 'daily' ? 'bg-gray-200' : ''}`}
            onClick={() => setTab('daily')}
          >
            Daily
          </button>
          <button
            className={`px-3 py-1 ${tab === 'monthly' ? 'bg-gray-200' : ''}`}
            onClick={() => setTab('monthly')}
          >
            Monthly
          </button>
        </div>

        <div>
          <label className="block text-xs opacity-70">Child</label>
          <select
            value={child}
            onChange={(e) => setChild(e.target.value)}
            className="border p-2 min-w-[200px]"
          >
            {isAdmin && <option value="ALL">All children</option>}
            {!isAdmin && <option value="ALL">All my children</option>}
            {(childrenQuery.data || []).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        {tab === 'daily' && (
          <>
            <div>
              <label className="block text-xs opacity-70">Type</label>
              <select
                className="border p-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All</option>
                <option value="pre">Pre-sleep</option>
                <option value="post">Post-sleep</option>
              </select>
            </div>

            <div>
              <label className="block text-xs opacity-70">From</label>
              <input
                type="date"
                className="border p-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs opacity-70">To</label>
              <input
                type="date"
                className="border p-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button className="border rounded px-2 py-1" onClick={setToday}>
                Today
              </button>
              <button className="border rounded px-2 py-1" onClick={setThisWeek}>
                This week
              </button>
              <button className="border rounded px-2 py-1" onClick={setThisMonth}>
                This month
              </button>
            </div>
          </>
        )}

        {tab === 'monthly' && (
          <div>
            <label className="block text-xs opacity-70">Month</label>
            <input
              type="month"
              className="border p-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        )}
      </div>

      {loading && <div>Loading…</div>}

      {!loading && (!data || data.length === 0) && (
        <div className="opacity-70">No reports found.</div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {(data || []).map((r) => (
          <ReportCard
            key={r._id}
            item={r}
            variant={tab === 'daily' ? 'daily' : 'monthly'}
          />
        ))}
      </div>
    </div>
  );
}
