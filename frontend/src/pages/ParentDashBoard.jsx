import { useQuery } from '@tanstack/react-query';
import api from '../api/client';


export default function ParentDashboard() {
const { data } = useQuery({ queryKey: ['children-mine'], queryFn: async ()=> (await api.get('/children/mine')).data });
return (
<div className="p-4 space-y-3">
<h1 className="text-xl font-semibold">My Children</h1>
<div className="grid md:grid-cols-2 gap-3">
{(data||[]).map(c => (
<div key={c._id} className="border rounded p-3">
<div className="font-medium">{c.name}</div>
<div className="text-sm opacity-70">Born: {c.birthDate ? new Date(c.birthDate).toLocaleDateString() : '—'}</div>
</div>
))}
</div>
</div>
);
}