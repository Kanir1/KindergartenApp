import api from '../api/client';
import { useState } from 'react';


export default function PhotoUploader({ childId, onDone }) {
const [files, setFiles] = useState([]);
const [busy, setBusy] = useState(false);
const [result, setResult] = useState(null);


const upload = async () => {
if (!files?.length) return;
setBusy(true);
try {
const fd = new FormData();
for (const f of files) fd.append('photos', f);
if (childId) fd.append('child', childId);
const res = await api.post('/uploads/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
setResult(res.data);
onDone?.(res.data.photos || []);
} finally { setBusy(false); }
};


return (
<div className="border rounded p-3 space-y-2">
<input type="file" multiple accept="image/*" onChange={e => setFiles([...e.target.files])} />
<button onClick={upload} disabled={busy || !files.length} className="border rounded px-2 py-1">{busy ? 'Uploading…' : 'Upload'}</button>
{result && (
<div className="text-sm opacity-70">Uploaded {result.count} file(s)</div>
)}
</div>
);
}