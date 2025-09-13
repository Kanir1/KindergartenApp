import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function AdminParents() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin-parents'],
    queryFn: async () => (await api.get('/admin/parents')).data,
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/admin/parents/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-parents'] }),
  });

  const onDelete = async (p) => {
    const go = confirm(
      `Delete parent "${p.name || p.email}"?\n\nThis will delete the user account ONLY.\nChildren and ALL reports will be preserved.`
    );
    if (!go) return;
    try {
      await del.mutateAsync(p._id);
      alert('Parent deleted. Children and reports were preserved.');
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  return (
    <Page>
      <Header title="Parents">
        <Link
          to="/admin"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to Admin
        </Link>
      </Header>

      {list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : list.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Failed to load parents.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data || []).map((p) => (
            <div key={p._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {p.name || 'Unnamed Parent'}
                  </div>
                  <div className="text-xs text-slate-500 break-all">{p.email}</div>
                </div>
                <button
                  onClick={() => onDelete(p)}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  title="Delete parent (children & reports are preserved)"
                >
                  Delete
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Children" value={p.childCount} />
                <Stat label="Daily" value={p.dailyCount} />
                <Stat label="Monthly" value={p.monthlyCount} />
              </div>
            </div>
          ))}
          {!list.data?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold text-slate-800">No parents found</h3>
              <p className="mt-1 text-sm text-slate-500">Parents will appear here after registration.</p>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-lg font-semibold text-slate-800">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
