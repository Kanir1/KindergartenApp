import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

export default function CreateReport() {
  const nav = useNavigate();

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["children-all"],
    queryFn: async () => (await api.get("/children")).data,
  });

  const [form, setForm] = useState({
    child: "",
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    type: "pre", // 'pre' | 'post'
    meals: { breakfast: "", lunch: "", snack: "" },
    milkMl: 0,
    sleep: { start: "", end: "", minutes: "" },
    bathroomCount: 0,
    photos: [],
    notes: "",
  });

  // Compute minutes if start/end present
  const computedMinutes = useMemo(() => {
    if (!form.sleep.start || !form.sleep.end) return "";
    const s = new Date(form.sleep.start).getTime();
    const e = new Date(form.sleep.end).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return "";
    return Math.round((e - s) / 60000);
  }, [form.sleep.start, form.sleep.end]);

  useEffect(() => {
    if (computedMinutes !== "" && form.sleep.minutes === "") {
      setForm((f) => ({ ...f, sleep: { ...f.sleep, minutes: String(computedMinutes) } }));
    }
  }, [computedMinutes]); // eslint-disable-line

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (form.type === "pre") {
        return (await api.post("/daily/pre", payload)).data;
      }
      return (await api.post("/daily/post", payload)).data;
    },
    onSuccess: () => {
      nav(`/reports?tab=daily&child=${form.child}`);
    },
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const base = {
      child: form.child,
      date: form.date,
      photos: form.photos,
      notes: form.notes,
    };

    try {
      if (form.type === "pre") {
        const payload = {
          ...base,
          meals: form.meals,
          milkMl: Number(form.milkMl) || 0,
        };
        await mutation.mutateAsync(payload);
      } else {
        const payload = {
          ...base,
          sleep: {
            start: form.sleep.start || undefined,
            end: form.sleep.end || undefined,
            minutes:
              form.sleep.minutes !== "" ? Number(form.sleep.minutes) : computedMinutes || undefined,
          },
          bathroomCount: Number(form.bathroomCount) || 0,
        };
        await mutation.mutateAsync(payload);
      }
    } catch (e2) {
      if (e2?.response?.status === 409) {
        alert("A report for this child/date/type already exists.");
      } else {
        alert(e2?.response?.data?.message || e2.message || "Failed to create report");
      }
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Create Daily Report</h1>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
          <Section title="Basics">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Child</label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={form.child}
                  onChange={(e) => setForm((f) => ({ ...f, child: e.target.value }))}
                  required
                >
                  <option value="">{isLoading ? "Loading…" : "Choose child"}</option>
                  {children.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.externalId ? `(${c.externalId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: "pre" }))}
                className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${
                  form.type === "pre"
                    ? "bg-indigo-600 text-white ring-indigo-500"
                    : "bg-white text-slate-700 ring-slate-300"
                }`}
              >
                Pre-sleep
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: "post" }))}
                className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${
                  form.type === "post"
                    ? "bg-indigo-600 text-white ring-indigo-500"
                    : "bg-white text-slate-700 ring-slate-300"
                }`}
              >
                Post-sleep
              </button>
            </div>
          </Section>

          {form.type === "pre" ? (
            <>
              <Section title="Meals">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Breakfast"
                    value={form.meals.breakfast}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meals: { ...f.meals, breakfast: e.target.value } }))
                    }
                  />
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Lunch"
                    value={form.meals.lunch}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meals: { ...f.meals, lunch: e.target.value } }))
                    }
                  />
                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Snack"
                    value={form.meals.snack}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, meals: { ...f.meals, snack: e.target.value } }))
                    }
                  />
                </div>
              </Section>

              <Section title="Milk (mL)">
                <input
                  type="number"
                  min={0}
                  step={10}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={form.milkMl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, milkMl: Math.max(0, Number(e.target.value || 0)) }))
                  }
                  placeholder="e.g., 150"
                />
              </Section>
            </>
          ) : (
            <>
              <Section title="Sleep">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={form.sleep.start}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sleep: { ...f.sleep, start: e.target.value } }))
                      }
                    />
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={form.sleep.end}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sleep: { ...f.sleep, end: e.target.value } }))
                      }
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Minutes (optional)"
                    value={form.sleep.minutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sleep: { ...f.sleep, minutes: e.target.value } }))
                    }
                  />
                </div>
                {computedMinutes !== "" && (
                  <p className="mt-1 text-xs text-slate-500">
                    Auto-computed: {computedMinutes} minutes
                  </p>
                )}
              </Section>

              <Section title="Bathroom (times)">
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  value={form.bathroomCount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bathroomCount: Math.max(0, Number(e.target.value || 0)),
                    }))
                  }
                  placeholder="e.g., 2"
                />
              </Section>
            </>
          )}

          <Section title="Photos (optional)">
            {/* Keep your existing upload UI; this is a placeholder to bind to form.photos if needed */}
            <div className="text-xs text-slate-500">Your current upload control can remain here.</div>
          </Section>

          <Section title="Notes (optional)">
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Anything you'd like to add…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Section>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
