import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

function isoDate(value) {
  // Accept "YYYY-MM-DD" or "MM/DD/YYYY" and return YYYY-MM-DD
  const tryNative = new Date(value);
  if (!Number.isNaN(tryNative.getTime())) {
    return tryNative.toISOString().slice(0, 10);
  }
  const m = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [_, mm, dd, yyyy] = m;
    const d = new Date(+yyyy, +mm - 1, +dd);
    return d.toISOString().slice(0, 10);
  }
  return value; // let backend validate if unparseable
}

export default function NewChildForParent() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [childId, setChildId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      // Admin creates a child: POST /children (no parentId in body)
      await api.post("/children", {
        name: name.trim(),
        externalId: String(childId).trim(), // backend maps/duplicates to childId internally
        childId: String(childId).trim(),    // keep for legacy schema
        birthDate: isoDate(birthDate),
      });

      // Go back to Admin dashboard (or children list) on success
      nav("/admin", { replace: true, state: { created: true } });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to create child");
    }
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-800">Add Child</h1>
        <p className="mt-1 text-slate-500">Only admins can add children.</p>

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block">
            <span className="block text-sm font-medium text-slate-700">Full name *</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="mb-3 block">
            <span className="block text-sm font-medium text-slate-700">Child ID *</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              required
            />
          </label>

          <label className="mb-5 block">
            <span className="block text-sm font-medium text-slate-700">Birth date *</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </label>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add Child
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
