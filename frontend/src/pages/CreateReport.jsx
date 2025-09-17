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

/** ===== Hebrew preset options (from your photo) ===== */
const PRESETS = {
  פחמימות: ["לחם", "קוסקוס", "פתיתים", "עוגה", "פסטה"],
  חלבונים: ["ביצה", "טונה", "עוף", "בשר בקר", "גבינה לבנה", "גבינה צהובה", "קוטג׳","שניצל"],
  ממרחים: ["חומוס", "טחינה", "טחינה וסילאן", "לבנה", "ממרח תמרים", "ריבה"],
  "ירקות ופירות": [
    "מלפפון",
    "עגבניה",
    "גזר",
    "פלפל אדום",
    "תפוח עץ",
    "ענבים ירוקים",
    "אוכמניות",
    "מלון",
    "אגס",
    "אפרסק",
    "בננה",
  ],
};

function Pills({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((txt) => (
        <span
          key={txt}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
        >
          {txt}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(txt)}
              className="rounded-full px-1 text-[10px] opacity-60 hover:opacity-100"
              aria-label={`הסר ${txt}`}
            >
              ✕
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function MealPicker({ label, valueList, setValueList }) {
  const [other, setOther] = useState("");
  const toggle = (item) =>
    setValueList((arr) =>
      arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
    );
  const remove = (item) => setValueList((arr) => arr.filter((x) => x !== item));
  const addOther = () => {
    const clean = other.trim();
    if (!clean) return;
    if (!valueList.includes(clean)) setValueList((arr) => [...arr, clean]);
    setOther("");
  };

  return (
    <div className="space-y-3">
      {/* Grid of categories with checkboxes */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(PRESETS).map(([cat, options]) => (
          <div key={cat} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-600">{cat}</div>
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={valueList.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Other */}
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="אחר…"
          value={other}
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOther())}
        />
        <button
          type="button"
          onClick={addOther}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          הוסף
        </button>
        {!!valueList.length && (
          <button
            type="button"
            onClick={() => setValueList([])}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            נקה הכל
          </button>
        )}
      </div>

      <Pills items={valueList} onRemove={remove} />

      {/* Small hint */}
      <p className="text-xs text-slate-500">
        נשמור את הבחירה כטקסט בעברית בשדה {label === "ארוחת בוקר" ? "Breakfast" : "Lunch"}.
      </p>
    </div>
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

  // NEW: selected options for breakfast/lunch
  const [breakfastSel, setBreakfastSel] = useState([]);
  const [lunchSel, setLunchSel] = useState([]);

  // NEW: files selected but not yet uploaded (they will be uploaded on Save)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitErr, setSubmitErr] = useState("");

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
      if (form.type === "pre") return (await api.post("/daily/pre", payload)).data;
      return (await api.post("/daily/post", payload)).data;
    },
    onSuccess: () => nav(`/reports?tab=daily&child=${form.child}`),
  });

  const uploadNewPhotosIfAny = async () => {
    if (!selectedFiles.length) return [];
    const fd = new FormData();
    selectedFiles.forEach((f) => fd.append("photos", f)); // field name 'photos'
    if (form.child) fd.append("child", form.child);       // optional: folder grouping on backend
    const res = await api.post("/uploads/photos", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const uploaded = (res.data?.photos || []).map((p) => p.url);
    return uploaded;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");

    const base = { child: form.child, date: form.date, notes: form.notes };

    try {
      const uploaded = await uploadNewPhotosIfAny();
      const photos = [...(form.photos || []), ...uploaded];

      if (form.type === "pre") {
        // join selected items (Hebrew) into a readable string
        const breakfastText = breakfastSel.join(", ");
        const lunchText = lunchSel.join(", ");
        const payload = {
          ...base,
          meals: { breakfast: breakfastText, lunch: lunchText, snack: form.meals.snack },
          milkMl: Number(form.milkMl) || 0,
          photos,
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
          photos,
        };
        await mutation.mutateAsync(payload);
      }
    } catch (e2) {
      if (e2?.response?.status === 409) setSubmitErr("A report for this child/date/type already exists.");
      else setSubmitErr(e2?.response?.data?.message || e2.message || "Failed to create report");
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white py-10">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Create Daily Report</h1>
        </div>

        {submitErr && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
            {submitErr}
          </div>
        )}

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
              <Section title="Meals — ארוחת בוקר">
                <MealPicker label="ארוחת בוקר" valueList={breakfastSel} setValueList={setBreakfastSel} />
              </Section>

              <Section title="Meals — ארוחת צהריים">
                <MealPicker label="ארוחת צהריים" valueList={lunchSel} setValueList={setLunchSel} />
              </Section>

              <Section title="Snack — נשנוש">
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="לדוגמה: יוגורט"
                  value={form.meals.snack}
                  onChange={(e) => setForm((f) => ({ ...f, meals: { ...f.meals, snack: e.target.value } }))}
                />
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
                  placeholder="למשל: 150"
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
                  <p className="mt-1 text-xs text-slate-500">Auto-computed: {computedMinutes} minutes</p>
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
            <label
              htmlFor="photos-create"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:bg-slate-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5v6m0 0H6m6 0h6M5 19h14a2 2 0 0 0 2-2V9.5a2 2 0 0 0-.586-1.414l-2.5-2.5A2 2 0 0 0 16.5 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"/>
              </svg>
              Choose image(s)
            </label>
            <input
              id="photos-create"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="sr-only"
            />

            {selectedFiles.length > 0 ? (
              <p className="mt-2 text-xs text-slate-600">
                Selected: {selectedFiles.map((f) => f.name).join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No files chosen</p>
            )}

            {!!(form.photos || []).length && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(form.photos || []).map((url, i) => (
                  <div key={url + i} className="overflow-hidden rounded-xl border border-slate-200">
                    <img src={url} alt={`Photo ${i + 1}`} className="h-40 w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
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
