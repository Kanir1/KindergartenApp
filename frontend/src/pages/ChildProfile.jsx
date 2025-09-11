// src/pages/ChildProfile.jsx
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Header({ title, right }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
      {right}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{children || "—"}</div>
    </div>
  );
}
function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}
function fmtDate(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return String(d || ""); }
}

export default function ChildProfile() {
  const { id } = useParams();
  const nav = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["child", id],
    queryFn: async () => (await api.get(`/children/${id}`)).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Page>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  if (error || !data) {
    const msg = error?.response?.data?.message || error?.message || "Failed to load child";
    return (
      <Page>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          {msg}
          <div className="mt-3">
            <button
              onClick={() => nav(-1)}
              className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              ← Go back
            </button>
          </div>
        </div>
      </Page>
    );
  }

  const child = data;
  const idLabel = child.externalId || child.childId || child._id;

  return (
    <Page>
      <Header
        title={child.name || "Child"}
        right={
          <div className="flex gap-2">
            <button
              onClick={() => nav(-1)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back
            </button>
            <Link
              to="/reports"
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              View Reports
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {child.group && <Badge>Group: {child.group}</Badge>}
        {idLabel && <Badge>ID: {idLabel}</Badge>}
        {child.birthDate && <Badge>Born: {fmtDate(child.birthDate)}</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {"nickname" in child && <Field label="Nickname">{child.nickname}</Field>}
        {"medicalInfo" in child && <Field label="Medical Info">{child.medicalInfo}</Field>}
        {"allergies" in child && <Field label="Allergies">{child.allergies}</Field>}
        {"notes" in child && <Field label="Notes">{child.notes}</Field>}
      </div>
    </Page>
  );
}
