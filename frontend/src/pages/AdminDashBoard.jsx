import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Link } from 'react-router-dom';


export default function AdminDashboard() {
const { data } = useQuery({ queryKey: ['children-all'], queryFn: async ()=> (await api.get('/children')).data });
return (
<div className="p-4 space-y-4">
<div className="flex items-center gap-3">
<h1 className="text-xl font-semibold">Admin Dashboard</h1>
<Link to="/reports/new" className="border rounded px-2 py-1">New Report</Link>
</div>
<div className="grid md:grid-cols-3 gap-3">
{(data||[]).map(c => (
<div key={c._id} className="border rounded p-3">
<div className="font-medium">{c.name}</div>
<div className="text-sm opacity-70">Parent: {c.parentName || c.parentId}</div>
</div>
))}
</div>
</div>
);
}