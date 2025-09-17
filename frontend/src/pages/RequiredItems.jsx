import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { toast } from "sonner";

function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Card({ title, children, side }) {
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
const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function RequiredItems() {
  const { id: childId } = useParams(); // /children/:id/required-items
  const nav = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const childQ = useQuery({
    queryKey: ["child", childId],
    queryFn: async () => (await api.get(`/children/${childId}`)).data,
  });

  const latestQ = useQuery({
    queryKey: ["required-items", childId],
    queryFn: async () => (await api.get(`/required-items/latest/${childId}`)).data,
  });

  // mark read when parent lands on this page
  useEffect(() => {
    (async () => {
      if (user?.role !== "parent") return;
      try {
        await api.post(`/required-items/latest/${childId}/read`);
        qc.invalidateQueries({ queryKey: ["required-items", childId] });
      } catch {}
    })();
  }, [childId, qc, user?.role]);

  const createMut = useMutation({
    mutationFn: async (payload) => (await api.post("/required-items", payload)).data,
    onSuccess: () => {
      toast.success("Required items posted");
      qc.invalidateQueries({ queryKey: ["required-items", childId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || e.message),
  });

  const goBack = () => {
    const from = location.state?.from;
    if (from?.pathname) nav(from.pathname, { replace: true });
    else if (window.history.length > 1) nav(-1);
    else nav(`/children/${childId}`, { replace: true });
  };

  const latest = latestQ.data;

  return (
    <Page>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Required Items{childQ.data?.name ? ` • ${childQ.data.name}` : ""}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={goBack}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <Card title="Latest request">
          {!latest ? (
            <div className="text-sm text-slate-600">No required items posted yet.</div>
          ) : (
            <ViewItems data={latest} />
          )}
        </Card>

        {isAdmin && (
          <Card
            title="Post a new request"
            side={
              <button
                onClick={() => createMut.mutate({ child: childId, items })}
                disabled={createMut.isLoading}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {createMut.isLoading ? "Saving…" : "Post"}
              </button>
            }
          >
            <Compose itemsStateKey="compose-items" />
          </Card>
        )}
      </div>
    </Page>
  );
}

/* ---------- helpers/components ---------- */

function ViewItems({ data }) {
  const rows = [
    ["חיתולים", !!data?.items?.diapers],
    ["מגבונים", !!data?.items?.wetWipes],
    ["בגדים", !!data?.items?.clothing],
  ];
  return (
    <div>
      <div className="mb-3 text-xs text-slate-500">
        Updated {new Date(data?.createdAt).toLocaleString()}
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map(([label, on]) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            <span>{label}</span>
          </li>
        ))}
        {data?.items?.other?.trim() && (
          <li className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="text-xs font-medium text-slate-600">Other</div>
            <div className="text-sm text-slate-800">{data.items.other}</div>
          </li>
        )}
      </ul>
    </div>
  );
}

// simple local state container
let items = { diapers: false, wetWipes: false, clothing: false, other: "" };

function Compose({ itemsStateKey }) {
  const [local, setLocal] = useState(items);

  useEffect(() => {
    items = local; // sync back to module-level for the Post button
  }, [local]);

  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={local.diapers}
          onChange={(e) => setLocal({ ...local, diapers: e.target.checked })}
        />
        <span>חיתולים</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={local.wetWipes}
          onChange={(e) => setLocal({ ...local, wetWipes: e.target.checked })}
        />
        <span>מגבונים</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={local.clothing}
          onChange={(e) => setLocal({ ...local, clothing: e.target.checked })}
        />
        <span>בגדים</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">Other (optional)</span>
        <input
          className={inputCls}
          value={local.other}
          onChange={(e) => setLocal({ ...local, other: e.target.value })}
          placeholder="e.g., cream, bottle, pacifier…"
        />
      </label>
    </form>
  );
}
