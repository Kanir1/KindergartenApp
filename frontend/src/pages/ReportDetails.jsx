// src/pages/ReportDetails.jsx
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { toast } from 'sonner';

export default function ReportDetails() {
  const { kind, id } = useParams(); // kind: 'daily' | 'monthly'
  const { user } = useAuth();
  const nav = useNavigate();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report', kind, id],
    queryFn: async () => {
      // kind maps to backend route names: /daily/:id or /monthly/:id
      const res = await api.get(`/${kind}/${id}`);
      return res.data;
    },
    retry: false,        // don't silently retry forever
    refetchOnWindowFocus: false,
  });

  const onDelete = async () => {
    if (!isAdmin) return;
    if (!confirm('Delete this report?')) return;
    try {
      await api.delete(`/${kind}/${id}`);
      toast.success('Report deleted');
      nav('/reports');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  if (isLoading) return <div className="p-4">Loading…</div>;

  if (isError) {
    // Show exactly what failed so we can fix fast
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || 'Request failed';
    return (
      <div className="p-4 text-red-600 space-y-2">
        <div>Failed to load.</div>
        <div className="text-sm opacity-80">Kind: <code>{String(kind)}</code></div>
        <div className="text-sm opacity-80">ID: <code>{String(id)}</code></div>
        {status && <div className="text-sm opacity-80">HTTP {status}</div>}
        <div className="text-sm opacity-80">{msg}</div>
        <Link className="underline" to="/reports">Back to reports</Link>
      </div>
    );
  }

  if (!data) return <div className="p-4">Not found</div>;

  const head = kind === 'daily'
    ? `${data.date} • ${data.type === 'preSleep' ? 'Pre-sleep' : 'Post-sleep'}`
    : `${data.month}`;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{head}</h1>
        <div className="text-sm opacity-70">{data.child?.name || '—'}</div>
      </div>

      {kind === 'daily' ? (
        <>
          {data.meals && (
            <div className="text-sm space-y-1">
              <div><span className="opacity-70">Breakfast:</span> {data.meals.breakfast || '—'}</div>
              <div><span className="opacity-70">Lunch:</span> {data.meals.lunch || '—'}</div>
              <div><span className="opacity-70">Snack:</span> {data.meals.snack || '—'}</div>
            </div>
          )}
          {data.hydration && (
            <div className="text-sm">
              <span className="opacity-70">Hydration:</span> {data.hydration.status || '—'}
              {data.hydration.cups !== undefined ? ` (${data.hydration.cups} cups)` : ''}
            </div>
          )}
          {data.type === 'postSleep' && data.sleep && (
            <div className="text-sm">
              <span className="opacity-70">Sleep:</span>{' '}
              {data.sleep.start ? new Date(data.sleep.start).toLocaleString() : '—'} →{' '}
              {data.sleep.end ? new Date(data.sleep.end).toLocaleString() : '—'}
              {data.sleep.minutes !== undefined ? ` (${data.sleep.minutes} min)` : ''}
            </div>
          )}
        </>
      ) : (
        <>
          {data.summary && <div className="text-sm"><span className="opacity-70">Summary:</span> {data.summary}</div>}
          {Array.isArray(data.milestones) && data.milestones.length > 0 && (
            <div className="text-sm">
              <span className="opacity-70">Milestones:</span>
              <ul className="list-disc pl-5">
                {data.milestones.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {data.mealsOverview && <div className="text-sm"><span className="opacity-70">Meals:</span> {data.mealsOverview}</div>}
          {data.sleepOverview && <div className="text-sm"><span className="opacity-70">Sleep:</span> {data.sleepOverview}</div>}
          {data.hydrationOverview && <div className="text-sm"><span className="opacity-70">Hydration:</span> {data.hydrationOverview}</div>}
        </>
      )}

      {data.notes && (
        <div className="text-sm">
          <span className="opacity-70">Notes:</span> {data.notes}
        </div>
      )}

      {!!(data.photos || []).length && (
        <div className="grid grid-cols-3 gap-2">
          {data.photos.map((p, i) => {
            const url = typeof p === 'string' ? p : p?.url;
            if (!url) return null;
            return <img key={i} src={url} className="w-full h-40 object-cover rounded" />;
          })}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={() => window.print()} className="border rounded px-3 py-1">Print</button>
        {isAdmin && (
          <>
            <Link to={`/reports/${kind}/${id}/edit`} className="border rounded px-3 py-1">Edit</Link>
            <button onClick={onDelete} className="border rounded px-3 py-1">Delete</button>
          </>
        )}
      </div>
    </div>
  );
}
