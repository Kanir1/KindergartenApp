// src/pages/NewChildForParent.jsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client";

// Local timezone-safe YYYY-MM-DD
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}

function Header({ title }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">Only you and admins will see this child.</p>
    </div>
  );
}

export default function NewChildForParent() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    childId: "",
    birthDate: "",
  });
  const [err, setErr] = useState("");
  const [dateNote, setDateNote] = useState(""); // inline note if we clamp a future date

  const { mutate, isPending } = useMutation({
    mutationFn: async (payload) => (await api.post("/children/mine", payload)).data,
    onSuccess: () => nav("/my-children", { state: { created: true } }),
    onError: (e) =>
      setErr(e?.response?.data?.message || e.message || "Failed to add child"),
  });

  const maxDate = todayLocalISO();

  function handleChange(e) {
    const { name, value } = e.target;
    setErr("");
    if (name === "birthDate") {
      // Clamp to today if a future date is chosen
      if (value && value > maxDate) {
        setForm((f) => ({ ...f, birthDate: maxDate }));
        setDateNote("Birth date cannot be in the future. Adjusted to today.");
        return;
      }
      setDateNote("");
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!form.name.trim()) return setErr("Name is required");
    if (!form.childId.trim()) return setErr("Child ID is required");
    if (!form.birthDate) return setErr("Birth date is required");

    // Final guard on submit
    if (form.birthDate > maxDate) {
      setErr("Birth date cannot be in the future");
      return;
    }

    // Map Child ID to both fields so either schema works
    const payload = {
      name: form.name.trim(),
      birthDate: form.birthDate,
      externalId: form.childId.trim(),
      childId: form.childId.trim(),
    };

    mutate(payload);
  }

  return (
    <Page>
      <Header title="Add Child" />

      {err && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
          {err}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Maya Cohen"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Child ID *</label>
            <input
              name="childId"
              value={form.childId}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 12345"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Birth date *</label>
            <input
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={handleChange}
              max={maxDate}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            {dateNote && (
              <p className="mt-1 text-xs text-amber-600">{dateNote}</p>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <Link
              to="/my-children"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isPending ? "Adding…" : "Add Child"}
            </button>
          </div>
        </div>
      </form>
    </Page>
  );
}
