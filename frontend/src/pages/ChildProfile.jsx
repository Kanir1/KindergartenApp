import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

export default function ChildProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();

  const { data: child, isLoading, error } = useQuery({
    queryKey: ["child", id],
    queryFn: async () => (await api.get(`/children/${id}`)).data,
    retry: false,
  });

  const status = error?.response?.status;
  const errMsg =
    status === 404 ? "Child not found."
    : status === 403 ? "You don’t have permission to view this child."
    : error ? (error.response?.data?.message || error.message)
    : "";

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const ORIGIN = API_BASE.replace(/\/api\/?$/, "");

  // Prefer going back to the real previous page; if none, do nothing
  const goBack = () => {
    if (window.history.length > 1) nav(-1);
  };

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {child?.name || (isLoading ? "Loading…" : "Child Profile")}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={goBack}
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>
          {child?._id && (
            <>
              <Link
                // carry current location so Edit can optionally use it
                state={{ from: location }}
                to={`/children/${child._id}/edit`}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Info
              </Link>
              <Link
                to={`/reports?child=${child._id}`}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                View Reports
              </Link>
            </>
          )}
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
          {/* Details */}
          <Section title="Details">
            <div className="flex flex-wrap gap-2 text-sm">
              {child.externalId && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  ID: <b>{child.externalId}</b>
                </span>
              )}
              {child.birthDate && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Born: <b>{new Date(child.birthDate).toLocaleDateString()}</b>
                </span>
              )}
              {child.group && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  Group: <b>{child.group}</b>
                </span>
              )}
            </div>
          </Section>

          {/* Parent Notes (read-only) */}
          <Section title="Parent Notes">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-slate-700 mb-1">Medical condition</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 min-h-24">
                  {child.medicalCondition?.trim() || <span className="opacity-60">—</span>}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-700 mb-1">Important notes / special treatment</div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 min-h-24">
                  {child.specialNotes?.trim() || <span className="opacity-60">—</span>}
                </div>
              </div>
            </div>
          </Section>

          {/* Authorized Pickups (read-only list) */}
          <Section title="Authorized Pickups">
            {child.authorizedPickups?.length ? (
              <div className="grid gap-3">
                {child.authorizedPickups.map((p) => (
                  <div key={p._id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
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
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                No authorized pickups yet.
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
