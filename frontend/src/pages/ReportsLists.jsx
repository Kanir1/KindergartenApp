import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import ReportCard from '../components/ReportCard';

// Local YYYY-MM-DD
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
const MAX_DATE = todayLocalISO();

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Header({ title, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
function Segmented({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
      {['daily', 'monthly'].map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            value === k ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          {k[0].toUpperCase() + k.slice(1)}
        </button>
      ))}
    </div>
  );
}
function FilterLabel({ children }) {
  return <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>;
}

export default function ReportsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const loc = useLocation();
  const search = new URLSearchParams(loc.search);

  // --- Initialize filters from link state or query string (first mount) ---
  const initialTab = search.get('tab') === 'monthly' ? 'monthly' : 'daily';
  const initialChild = (loc.state && loc.state.child) || search.get('child') || 'ALL';
  const initialType = ['pre', 'post'].includes(search.get('type') || '') ? search.get('type') : '';
  const initialFrom = search.get('from') || '';
  const initialTo = search.get('to') || '';
  const initialMonth = search.get('month') || '';

  const [tab, setTab] = useState(initialTab);       // 'daily' | 'monthly'
  const [child, setChild] = useState(initialChild); // 'ALL' or childId
  const [type, setType] = useState(initialType);    // '', 'pre', 'post'
  const [from, setFrom] = useState(initialFrom);    // YYYY-MM-DD
  const [to, setTo] = useState(initialTo);          // YYYY-MM-DD
  const [month, setMonth] = useState(initialMonth); // YYYY-MM

  // Reset or apply filters whenever navigation happens to /reports
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const hasQuery = params.toString().length > 0;
    const wantsReset = Boolean(loc.state?.reset);

    // A) Plain /reports or explicit reset -> defaults
    if (!hasQuery || wantsReset) {
      setTab('daily');
      setChild('ALL');
      setType('');
      setFrom('');
      setTo('');
      setMonth('');
      return;
    }

    // B) Apply incoming filters (from AdminDashboard "View Reports")
    const nextTab = params.get('tab');
    const nextChild = (loc.state && loc.state.child) || params.get('child');
    const nextType = params.get('type');
    const nextFrom = params.get('from');
    const nextTo = params.get('to');
    const nextMonth = params.get('month');

    if (nextTab) setTab(nextTab === 'monthly' ? 'monthly' : 'daily');
    if (nextChild !== null) setChild(nextChild || 'ALL');
    if (params.has('type')) setType(nextType === 'pre' || nextType === 'post' ? nextType : '');
    if (params.has('from')) setFrom(nextFrom || '');
    if (params.has('to')) setTo(nextTo || '');
    if (params.has('month')) setMonth(nextMonth || '');
  }, [loc.key]); // runs whenever the router location changes

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
    if (type) p.set('type', type);
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
    keepPreviousData: true,
  });

  const monthlyQuery = useQuery({
    enabled: tab === 'monthly',
    queryKey: ['monthly', monthlyParams],
    queryFn: async () => {
      const qs = monthlyParams ? `?${monthlyParams}` : '';
      return (await api.get(`/monthly${qs}`)).data || [];
    },
    keepPreviousData: true,
  });

  const data = tab === 'daily' ? dailyQuery.data : monthlyQuery.data;
  const loading = tab === 'daily' ? dailyQuery.isLoading : monthlyQuery.isLoading;
  const loadingChildren = childrenQuery.isLoading;
  const error = (tab === 'daily' ? dailyQuery.error : monthlyQuery.error) || childrenQuery.error;

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
    start.setDate(now.getDate() - 6);
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  };
  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(start.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  };
  const resetFilters = () => {
    setChild('ALL');
    setType('');
    setFrom('');
    setTo('');
    setMonth('');
  };

  return (
    <Page>
      <Header title="Reports">
        <Segmented value={tab} onChange={setTab} />
      </Header>

      {/* Filters Card */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Child */}
          <div>
            <FilterLabel>{isAdmin ? 'Child (all)' : 'My child'}</FilterLabel>
            <select
              value={child}
              onChange={(e) => setChild(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loadingChildren}
            >
              {isAdmin ? (
                <option value="ALL">All children</option>
              ) : (
                <option value="ALL">All my children</option>
              )}
              {(childrenQuery.data || []).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.externalId ? `(${c.externalId})` : c.childId ? `(${c.childId})` : ''}
                </option>
              ))}
            </select>
          </div>

          {tab === 'daily' ? (
            <>
              {/* Type */}
              <div>
                <FilterLabel>Type</FilterLabel>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="pre">Pre-sleep</option>
                  <option value="post">Post-sleep</option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 md:col-span-1">
                <div>
                  <FilterLabel>From</FilterLabel>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={from}
                    max={MAX_DATE}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <FilterLabel>To</FilterLabel>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={to}
                    max={MAX_DATE}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="md:col-span-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={setToday}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Today
                  </button>
                  <button
                    onClick={setThisWeek}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    This week
                  </button>
                  <button
                    onClick={setThisMonth}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    This month
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Monthly
            <div>
              <FilterLabel>Month</FilterLabel>
              <input
                type="month"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={resetFilters}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
          <span className="text-xs text-slate-500">
            {(dailyQuery.isFetching || monthlyQuery.isFetching) ? 'Updating…' : ' '}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Failed to load reports.
        </div>
      )}

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-6 w-6 opacity-60">
              <path fill="currentColor" d="M2 5a2 2 0 0 1 2-2h7l2 2h7a2 2 0 0 1 2 2v3H2V5Zm0 6h22v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No reports</h3>
          <p className="mt-1 text-sm text-slate-500">Adjust filters.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data || []).map((r) => (
            <ReportCard
              key={r._id}
              item={r}
              variant={tab === 'daily' ? 'daily' : 'monthly'}
            />
          ))}
        </div>
      )}
    </Page>
  );
}
