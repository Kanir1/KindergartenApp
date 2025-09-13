// src/pages/AdminDashBoard.jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';

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

export default function AdminDashBoard() {
  const { data = [], isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['children-all'],
    // Backend now populates parents and derives parentName
    queryFn: async () => (await api.get('/children')).data,
  });

  return (
    <Page>
      <Header title="Admin Dashboard">
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          

          {/* Link/Unlink tool */}
          <Link
            to="/admin/link"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Link Parent ↔ Child
          </Link>

          {/* Parents overview */}
          <Link
            to="/admin/parents"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Manage Parents
          </Link>

          <Link to="/admin/parents/new" className="rounded-2xl bg-indigo-600 px-4 py-2 text-white">
            Register Parent
          </Link>

          <Link
            to="/admin/children/new"
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add Child
          </Link>

          <Link
            to="/reports/new"
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            New Daily
          </Link>
          <Link
            to="/reports/monthly/new"
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            New Monthly
          </Link>
        </div>
      </Header>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Failed to load children.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">No children yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create a report once children are added.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => {
            const idLabel = c.externalId || c.childId || c._id;

            const parentLabel =
              (c.parentName && c.parentName.trim())
                ? c.parentName
                : (Array.isArray(c.parents) && c.parents.length
                    ? `${c.parents.length} parent${c.parents.length > 1 ? 's' : ''}`
                    : (c.parentId || '—'));

            return (
              <div
                key={c._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-800">{c.name}</div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      Parent: {parentLabel}
                    </p>
                    {idLabel && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">ID: {idLabel}</p>
                    )}
                    {c.birthDate && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Born: {new Date(c.birthDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {c.group && <Badge>Group: {c.group}</Badge>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/children/${c._id}`}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Profile
                  </Link>
                  {/* Pass child in query AND state so ReportsList can pre-filter */}
                  <Link
                    to={`/reports?tab=daily&child=${c._id}`}
                    state={{ child: c._id }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View Reports
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
