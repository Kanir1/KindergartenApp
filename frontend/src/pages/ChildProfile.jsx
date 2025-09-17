import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useAuth } from "../auth/AuthProvider";

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
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: child, isLoading, error } = useQuery({
    queryKey: ["child", id],
    queryFn: async () => (await api.get(`/children/${id}`)).data,
    retry: false,
  });

  // latest required-items (for unread dot)
  const latestReq = useQuery({
    enabled: !!child?._id,
    queryKey: ["required-items", child?._id],
    queryFn: async () => (await api.get(`/required-items/latest/${child._id}`)).data,
  });

  const isUnreadForParent =
    !!latestReq.data &&
    user?.role === "parent" &&
    !latestReq.data.readBy?.map(String).includes(String(user._id || user.id));

  const status = error?.response?.status;
  const errMsg =
    status === 404
      ? "Child not found."
      : status === 403
      ? "You don’t have permission to view this child."
      : error
      ? error.response?.data?.message || error.message
      : "";

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const ORIGIN = API_BASE.replace(/\/api\/?$/, "");

  // Prefer going back to the real previous page; if none, do nothing
  const goBack = () => {
    if (window.history.length > 1) nav(-1);
  };

  const openRequiredItems = async () => {
    // If parent, mark latest as read when entering the page
    if (user?.role === "parent" && child?._id) {
      try {
        await api.post(`/required-items/latest/${child._id}/read`);
        qc.invalidateQueries({ queryKey: ["required-items", child._id] });
      } catch {}
    }
    nav(`/children/${child._id}/required-items`, { state: { from: location } });
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


          {/* Admin-only: compose/manage */}
          {isAdmin && child?._id && (
            <Link
              to={`/children/${child._id}/required-items`}
              state={{ from: location }}
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Add/Edit Required Items
            </Link>
          )}

          {/* View Required Items (parents + admins) */}
          {child?._id && (
            <button
              type="button"
              onClick={openRequiredItems}
              className="relative rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Required Items
              {isUnreadForParent && (
                <span className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          )}

          {child?._id && (
            <>
              <Link
                state={{ from: location }}
                to={`/children/${child._id}/edit`}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Info
              </Link>

              <Link
                to={`/reports?child=${child._id}`}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                <div className="mb-1 text-xs font-medium text-slate-700">Medical condition</div>
                <div className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {child.medicalCondition?.trim() || <span className="opacity-60">—</span>}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-slate-700">Important notes / special treatment</div>
                <div className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
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
                  <div
                    key={p._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
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
