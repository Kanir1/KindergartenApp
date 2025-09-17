// src/pages/EditMonthly.jsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/client";
import { toast } from "sonner";
import { useSpeechToText } from "../hooks/useSpeechToText";

const schema = z.object({
  summary: z.string().optional(),
  milestones: z.string().optional(),        // comma-separated in UI
  mealsOverview: z.string().optional(),
  sleepOverview: z.string().optional(),
  hydrationOverview: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

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
function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
      {children}
    </section>
  );
}
const inputCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function EditMonthly() {
  const { id } = useParams();          // monthly report id
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [childInfo, setChildInfo] = useState({ name: "", externalId: "" });
  const [month, setMonth] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      summary: "",
      milestones: "",
      mealsOverview: "",
      sleepOverview: "",
      hydrationOverview: "",
      notes: "",
    },
  });

  // --- Speech-to-text for Summary ---
  const [sttLang, setSttLang] = useState("he-IL");
  const { supported, listening, transcript, error, start, stop, setTranscript } =
    useSpeechToText({ lang: sttLang, interim: true });

  useEffect(() => {
    if (!transcript) return;
    const current = getValues("summary") || "";
    const next = current ? `${current} ${transcript}` : transcript;
    setValue("summary", next, { shouldDirty: true });
    setTranscript("");
  }, [transcript, getValues, setValue, setTranscript]);

  // Load report
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/monthly/${id}`);
        const r = res.data;
        setChildInfo({
          name: r?.child?.name || "",
          externalId: r?.child?.externalId || r?.child?.childId || "",
        });
        setMonth(r?.month || "");

        reset({
          summary: r?.summary || "",
          milestones: Array.isArray(r?.milestones) ? r.milestones.join(", ") : (r?.milestones || ""),
          mealsOverview: r?.mealsOverview || "",
          sleepOverview: r?.sleepOverview || "",
          hydrationOverview: r?.hydrationOverview || "",
          notes: r?.notes || "",
        });
      } catch (e) {
        toast.error(e?.response?.data?.message || e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        summary: values.summary || "",
        milestones: (values.milestones || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        mealsOverview: values.mealsOverview || "",
        sleepOverview: values.sleepOverview || "",
        hydrationOverview: values.hydrationOverview || "",
        notes: values.notes || "",
      };
      await api.put(`/monthly/${id}`, payload);
      toast.success("Monthly report updated");
      nav(`/reports/monthly/${id}`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message || "Update failed";
      toast.error(msg);
      console.error(status, err);
    }
  };

  const goBack = () => (window.history.length > 1 ? nav(-1) : nav(`/reports/monthly/${id}`, { replace: true }));

  if (loading) {
    return (
      <Page>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">Loading…</div>
      </Page>
    );
  }

  return (
    <Page>
      <Header
        title={`Edit Monthly Report`}
        right={
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ← Back
            </button>
        }
      />

      <div className="mb-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{childInfo.name}</span>
        {childInfo.externalId && <span className="opacity-70"> ({childInfo.externalId})</span>}
        {month && <span className="opacity-70"> • {month}</span>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Section title="Overview">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-600">Summary</label>
                <div className="flex items-center gap-2">
                  <select
                    value={sttLang}
                    onChange={(e) => setSttLang(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                    title="Recognition language"
                  >
                    <option value="he-IL">HE</option>
                    <option value="en-US">EN</option>
                  </select>
                  <button
                    type="button"
                    onClick={listening ? stop : start}
                    disabled={!supported}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      listening ? "bg-rose-600 text-white" : "bg-indigo-600 text-white"
                    } disabled:opacity-50`}
                    title={supported ? "Dictate summary" : "Speech recognition not supported in this browser"}
                  >
                    {listening ? "Stop" : "🎤 Speak"}
                  </button>
                </div>
              </div>
              <textarea rows={3} {...register("summary")} className={inputCls} />
              {error && <p className="mt-1 text-xs text-rose-600">Mic error: {String(error)}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Milestones (comma-separated)
              </label>
              <input
                {...register("milestones")}
                className={inputCls}
                placeholder="e.g., Started counting to 10, Learned new song"
              />
            </div>
          </div>
        </Section>

        <Section title="Highlights">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Meals overview</label>
              <input {...register("mealsOverview")} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Sleep overview</label>
              <input {...register("sleepOverview")} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hydration overview</label>
              <input {...register("hydrationOverview")} className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Notes (optional)">
          <textarea rows={4} {...register("notes")} className={inputCls} />
          {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
        </Section>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </Page>
  );
}
