import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import api from "../api/client";

function Section({ title, children, side }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
        {side}
      </div>
      {children}
    </section>
  );
}

export default function ChildProfileEdit() {
  const { id } = useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const location = useLocation();

  const { data: child, isLoading, error } = useQuery({
    queryKey: ["child", id],
    queryFn: async () => (await api.get(`/children/${id}`)).data,
    retry: false,
  });

  const [medicalCondition, setMedicalCondition] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [notesErr, setNotesErr] = useState("");

  useEffect(() => {
    if (child) {
      setMedicalCondition(child.medicalCondition || "");
      setSpecialNotes(child.specialNotes || "");
    }
  }, [child]);

  // Smart return: if we have history, pop back; otherwise land on profile (replace)
  const backToProfile = () => {
    if (window.history.length > 1) nav(-1);
    else nav(`/children/${id}`, { replace: true, state: { from: location.state?.from || null } });
  };

  const saveNotes = useMutation({
    mutationFn: async (payload) => (await api.patch(`/children/${id}/parent-notes`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child", id] });
      backToProfile(); // pop Edit out of history
    },
    onError: (e) => setNotesErr(e?.response?.data?.message || e.message),
  });

  const addPickup = useMutation({
    mutationFn: async ({ name, phone, file }) => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phone);
      fd.append("photo", file);
      return (await api.post(`/children/${id}/pickups`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child", id] }),
  });

  const deletePickup = useMutation({
    mutationFn: async (pid) => (await api.delete(`/children/${id}/pickups/${pid}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child", id] }),
  });

  const status = error?.response?.status;
  const errMsg =
    status === 404 ? "Child not found."
      : status === 403 ? "You don’t have permission to edit this child."
      : error ? (error.response?.data?.message || error.message)
      : "";

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const ORIGIN = API_BASE.replace(/\/api\/?$/, "");

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {child?.name || (isLoading ? "Loading…" : "Edit Child")}
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={backToProfile}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <Link
            to={`/reports?child=${id}`}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            View Reports
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {errMsg || "Failed to load child."}
        </div>
      ) : !child ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Not found.</div>
      ) : (
        <>
          {/* Parent Notes (editable) */}
          <Section
            title="Parent Notes"
            side={
              <button
                onClick={() => saveNotes.mutate({ medicalCondition, specialNotes })}
                className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Save
              </button>
            }
          >
            {notesErr && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700">
                {notesErr}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="block text-xs font-medium text-slate-700">Medical condition</span>
                <textarea
                  className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2"
                  rows={4}
                  value={medicalCondition}
                  onChange={(e) => setMedicalCondition(e.target.value)}
                  placeholder="Allergies, chronic conditions, medications…"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-slate-700">Important notes / special treatment</span>
                <textarea
                  className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2"
                  rows={4}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="Pickup instructions, therapy schedules, other considerations…"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">Only the child’s parents and admins can view/edit this section.</p>
          </Section>

          {/* Authorized Pickups (list + add/remove) */}
          <Section title="Authorized Pickups">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                {child.authorizedPickups?.length ? (
                  child.authorizedPickups.map((p) => (
                    <div key={p._id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={`${ORIGIN}${p.photoUrl}`}
                          alt={p.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                          <div className="text-xs text-slate-600">{p.phone}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePickup.mutate(p._id)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                    No authorized pickups yet.
                  </div>
                )}
              </div>

              <AddPickupForm onAdd={(payload) => addPickup.mutate(payload)} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function AddPickupForm({ onAdd }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [err, setErr] = useState("");

  function onFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  }

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (!file) return setErr("Photo is required.");
    onAdd({ name, phone, file });
    setName(""); setPhone(""); setFile(null); setPreview(""); e.target.reset();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 p-4 space-y-3">
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{err}</div>}
      {preview && (
        <div className="flex items-center gap-3">
          <img src={preview} alt="preview" className="h-12 w-12 rounded-full object-cover" />
          <span className="text-xs text-slate-600">Preview</span>
        </div>
      )}
      <label className="block text-xs font-medium text-slate-700">
        Full name *
        <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
               value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Phone *
        <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
               value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        Photo (required)
        <input type="file" accept="image/*" className="mt-1 w-full" onChange={onFileChange} required />
      </label>
      <button type="submit" className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
        Add Authorized Person
      </button>
    </form>
  );
}
