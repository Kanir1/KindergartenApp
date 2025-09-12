import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'sonner';

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}
function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>
  );
}
function fmtDate(d) {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t) ? String(d) : t.toLocaleDateString();
}
function fmtDateTime(d) {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t) ? String(d) : t.toLocaleString();
}

export default function ReportDetails() {
  const { kind, id } = useParams(); // 'daily' | 'monthly'
  const nav = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report', kind, id],
    queryFn: async () => (await api.get(`/${kind}/${id}`)).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const onDelete = async () => {
    if (!confirm('Delete this report?')) return;
    try {
      await api.delete(`/${kind}/${id}`);
      toast.success('Report deleted');
      nav('/reports');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  if (isLoading) {
    return (
      <Page>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (isError) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || 'Request failed';
    return (
      <Page>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <div className="font-semibold">Failed to load.</div>
          <div className="mt-1 text-sm opacity-80">Kind: <code>{String(kind)}</code></div>
          <div className="text-sm opacity-80">ID: <code>{String(id)}</code></div>
          {status && <div className="text-sm opacity-80">HTTP {status}</div>}
          <div className="text-sm opacity-80">{msg}</div>
          <div className="mt-3">
            <Link
              className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
              to="/reports"
            >
              ← Back to reports
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  if (!data) return <Page><div className="p-4">Not found</div></Page>;

  const head =
    kind === 'daily'
      ? `${fmtDate(data.date)} • ${data.type === 'preSleep' ? 'Pre-sleep' : 'Post-sleep'}`
      : `${data.month || ''}`;

  const childName = data.child?.name || '—';
  const childId = data.child?.externalId || data.child?.childId || '';

  // Prefer milkMl; fallback to legacy hydration.cups * 200 for older pre-sleep docs
  const milkMl =
    data?.type === 'preSleep'
      ? (Number.isFinite(data.milkMl) ? Number(data.milkMl) : ((data.hydration?.cups ?? 0) * 200))
      : undefined;

  return (
    <Page>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {kind === 'daily' ? (
              <Badge tone={data.type === 'preSleep' ? 'indigo' : 'amber'}>
                {data.type === 'preSleep' ? 'Pre' : 'Post'}
              </Badge>
            ) : (
              <Badge tone="green">Monthly</Badge>
            )}
            <span className="text-sm text-slate-500">{head}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">
            {childName} {childId && <span className="text-base font-normal text-slate-500">({childId})</span>}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => nav(-1)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print
          </button>
          <Link
            to={`/reports/${kind}/${id}/edit`}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            className="rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>

      {kind === 'daily' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Meals (pre-sleep only) */}
          {data.type === 'preSleep' && data.meals && (
            <Section title="Meals">
              <div className="space-y-1 text-sm text-slate-800">
                <div><span className="opacity-70">Breakfast:</span> {data.meals.breakfast || '—'}</div>
                <div><span className="opacity-70">Lunch:</span> {data.meals.lunch || '—'}</div>
                <div><span className="opacity-70">Snack:</span> {data.meals.snack || '—'}</div>
              </div>
            </Section>
          )}

          {/* Pre-sleep: Milk (mL) */}
          {data.type === 'preSleep' && (
            <Section title="Milk">
              <div className="text-sm text-slate-800">
                <span className="opacity-70">Amount:</span> {Number.isFinite(milkMl) ? `${milkMl} mL` : '—'}
              </div>
            </Section>
          )}

          {/* Post-sleep: Sleep */}
          {data.type === 'postSleep' && data.sleep && (
            <Section title="Sleep">
              <div className="text-sm text-slate-800">
                <span className="opacity-70">Time:</span>{" "}
                {data.sleep.start ? fmtDateTime(data.sleep.start) : '—'} →{" "}
                {data.sleep.end ? fmtDateTime(data.sleep.end) : '—'}
                {data.sleep.minutes !== undefined ? (
                  <span> ({data.sleep.minutes} min)</span>
                ) : null}
              </div>
            </Section>
          )}

          {/* Post-sleep: Bathroom */}
          {data.type === 'postSleep' && (
            <Section title="Bathroom">
              <div className="text-sm text-slate-800">
                <span className="opacity-70">Times:</span>{" "}
                {typeof data.bathroomCount === 'number' ? data.bathroomCount : 0}
              </div>
            </Section>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* monthly-specific sections here, unchanged */}
          {data.summary && (
            <Section title="Summary">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{data.summary}</p>
            </Section>
          )}
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div className="mt-4">
          <Section title="Notes">
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{data.notes}</p>
          </Section>
        </div>
      )}

      {/* Photos */}
      {!!(data.photos || []).length && (
        <div className="mt-4">
          <Section title="Photos">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(data.photos || []).map((p, i) => {
                const url = typeof p === 'string' ? p : p?.url;
                if (!url) return null;
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-xl border border-slate-200"
                  >
                    <img src={url} alt={`Photo ${i + 1}`} className="h-40 w-full object-cover" />
                  </a>
                );
              })}
            </div>
          </Section>
        </div>
      )}
    </Page>
  );
}
