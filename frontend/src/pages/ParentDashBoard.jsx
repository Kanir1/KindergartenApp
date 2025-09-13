import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</div>
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

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 h-4 w-2/3 rounded bg-slate-200" />
      <div className="h-3 w-1/2 rounded bg-slate-200" />
    </div>
  );
}

export default function ParentDashBoard() {
  const { data = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['children-mine'],
    queryFn: async () => (await api.get('/children/mine')).data,
  });

  return (
    <Page>
      <Header title="My Children">
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          {/* ❌ Removed Add Child button */}
        </div>
      </Header>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Failed to load your children.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-6 w-6 opacity-60">
              <path
                fill="currentColor"
                d="M2 5a2 2 0 0 1 2-2h7l2 2h7a2 2 0 0 1 2 2v3H2V5Zm0 6h22v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8Z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No children linked yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Please contact the kindergarten admin to link your child to your account.
          </p>
          {/* ❌ Removed Add Child link */}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((c) => (
            <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-800">{c.name}</h3>
                  {(c.externalId || c.childId) && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      Child ID: {c.externalId || c.childId}
                    </p>
                  )}
                  {c.birthDate && (
                    <p className="mt-0.5 text-sm text-slate-500">
                      Birth date: {new Date(c.birthDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {c.group && <Badge>Group: {c.group}</Badge>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/reports"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Reports
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
