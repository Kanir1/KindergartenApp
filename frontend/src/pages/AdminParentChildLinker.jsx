// src/pages/AdminParentChildLinker.jsx
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/client";

function Flash({ type = "success", children, onClose }) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";
  return (
    <div className={`mt-4 rounded-2xl border p-3 ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm">{children}</div>
        {onClose && (
          <button
            className="text-xs opacity-70 hover:opacity-100"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminParentChildLinker() {
  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => (await api.get("/admin/parents")).data,
  });
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ["children-all"],
    queryFn: async () => (await api.get("/children")).data,
  });

  const [parentId, setParentId] = useState("");
  const [childIds, setChildIds] = useState([]);
  const [flash, setFlash] = useState(null); // {type: 'success'|'error', text: string}

  const selectedParent = useMemo(
    () => parents.find((p) => String(p._id) === String(parentId)),
    [parents, parentId]
  );

  const linkMutation = useMutation({
    mutationFn: async ({ parentId, childIds }) =>
      (await api.post(`/parents/${parentId}/link-children`, { childIds })).data,
    onSuccess: () => {
      setFlash({ type: "success", text: "Child(ren) linked successfully." });
      // keep selection, or clear: setChildIds([]);
    },
    onError: (e) => {
      setFlash({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to link selected child(ren).",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async ({ parentId, childIds }) =>
      (await api.post(`/parents/${parentId}/unlink-children`, { childIds })).data,
    onSuccess: () =>
      setFlash({ type: "success", text: "Child(ren) unlinked successfully." }),
    onError: (e) =>
      setFlash({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to unlink selected child(ren).",
      }),
  });

  const toggleChild = (id) =>
    setChildIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto w-full max-w-5xl px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-4">
            Link / Unlink Parent ↔ Child
          </h1>

          <div className="mb-6 space-y-2">
            <label className="text-sm font-medium text-slate-700">Select Parent</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
                setFlash(null);
              }}
            >
              <option value="">
                {parentsLoading ? "Loading…" : "Choose a parent"}
              </option>
              {parents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || p.email} ({p.email})
                </option>
              ))}
            </select>
            {selectedParent && (
              <div className="text-xs text-slate-500">
                Currently linked: <b>{selectedParent.childCount}</b>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700">Select Children</label>
            <div className="mt-2 border rounded-2xl max-h-64 overflow-auto divide-y">
              {childrenLoading && (
                <div className="p-3 text-sm text-slate-500">Loading…</div>
              )}
              {!childrenLoading && children.length === 0 && (
                <div className="p-3 text-sm text-slate-500">No children found.</div>
              )}
              {children.map((c) => (
                <label
                  key={c._id}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={childIds.includes(c._id)}
                    onChange={() => toggleChild(c._id)}
                  />
                  <div>
                    <div className="font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      Code: {c.externalId || "—"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={!parentId || childIds.length === 0 || linkMutation.isPending}
              onClick={() => linkMutation.mutate({ parentId, childIds })}
            >
              {linkMutation.isPending ? "Linking…" : "Link Selected"}
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={!parentId || childIds.length === 0 || unlinkMutation.isPending}
              onClick={() => unlinkMutation.mutate({ parentId, childIds })}
            >
              {unlinkMutation.isPending ? "Unlinking…" : "Unlink Selected"}
            </button>
          </div>

          {/* Flash message (success or error). JSON output removed. */}
          {flash && (
            <Flash type={flash.type} onClose={() => setFlash(null)}>
              {flash.text}
            </Flash>
          )}
        </div>
      </div>
    </div>
  );
}
