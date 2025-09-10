// src/pages/AdminDashBoard.jsx
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Link } from 'react-router-dom';

export default function AdminDashBoard() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['children-all'],
    queryFn: async () => (await api.get('/children')).data,
  });

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/reports/new" className="border rounded px-3 py-2">New Daily</Link>
          <Link to="/reports/monthly/new" className="border rounded px-3 py-2">New Monthly</Link>
        </div>
      </div>

      {isLoading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c._id} className="border rounded-lg p-4 space-y-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm opacity-70 break-words">
                Parent: {c.parentName || c.parentId || '—'}
              </div>
            </div>
          ))}
          {!data.length && <div className="opacity-60">No children yet.</div>}
        </div>
      )}
    </div>
  );
}
