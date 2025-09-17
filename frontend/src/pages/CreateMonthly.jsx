// src/pages/CreateMonthly.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { toast } from 'sonner';
import { useSpeechToText } from '../hooks/useSpeechToText'; // <-- NEW

const schema = z.object({
  child: z.string().min(1, 'Child is required'),
  month: z.string().min(7, 'Month is required'), // YYYY-MM
  summary: z.string().optional(),
  milestones: z.string().optional(), // comma-separated; split before submit
  mealsOverview: z.string().optional(),
  sleepOverview: z.string().optional(),
  hydrationOverview: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

// YYYY-MM for current month in local time
function currentMonth() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
const MAX_MONTH = currentMonth();

// --- small UI helpers for consistency ---
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
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function CreateMonthly() {
  const nav = useNavigate();
  const [children, setChildren] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    getValues,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      child: '',
      month: MAX_MONTH, // current YYYY-MM
      summary: '',
    },
  });

  // --- Speech-to-text (Summary) ---
  const [sttLang, setSttLang] = useState('he-IL'); // quick toggle HE/EN
  const { supported, listening, transcript, error, start, stop, setTranscript } =
    useSpeechToText({ lang: sttLang, interim: true });

  // Append finalized transcript chunks into the Summary field
  useEffect(() => {
    if (!transcript) return;
    const current = getValues('summary') || '';
    const next = current ? `${current} ${transcript}` : transcript;
    setValue('summary', next, { shouldDirty: true });
    setTranscript(''); // clear consumed chunk
  }, [transcript, getValues, setValue, setTranscript]);

  // Clamp month to avoid future months
  const monthVal = watch('month');
  useEffect(() => {
    if (monthVal && monthVal > MAX_MONTH) setValue('month', MAX_MONTH);
  }, [monthVal, setValue]);

  useEffect(() => {
    (async () => {
      // Admin route returns all children
      const res = await api.get('/children');
      setChildren(res.data || []);
      if (res.data?.[0]?._id) setValue('child', res.data[0]._id);
    })();
  }, [setValue]);

  const onSubmit = async (values) => {
    try {
      const payload = {
        child: values.child,
        month: values.month,
        summary: values.summary || '',
        milestones: (values.milestones || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        mealsOverview: values.mealsOverview || '',
        sleepOverview: values.sleepOverview || '',
        hydrationOverview: values.hydrationOverview || '',
        notes: values.notes || '',
      };

      const res = await api.post('/monthly', payload);
      toast.success('Monthly report created');
      nav(`/reports/monthly/${res.data._id}`);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        (status === 409
          ? 'A monthly report for this child and month already exists.'
          : err.message || 'Create failed');
      toast.error(msg);
      console.error(err);
    }
  };

  return (
    <Page>
      <Header
        title="Create Monthly Report"
        right={
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Section title="Basics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Child</label>
              <select {...register('child')} className={inputCls}>
                <option value="">Select…</option>
                {children.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.externalId ? `(${c.externalId})` : c.childId ? `(${c.childId})` : ''}
                  </option>
                ))}
              </select>
              {errors.child && (
                <p className="mt-1 text-sm text-rose-600">{errors.child.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Month</label>
              <input type="month" max={MAX_MONTH} {...register('month')} className={inputCls} />
              {errors.month && (
                <p className="mt-1 text-sm text-rose-600">{errors.month.message}</p>
              )}
            </div>
          </div>
        </Section>

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
                      listening ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
                    } disabled:opacity-50`}
                    title={supported ? 'Dictate summary' : 'Speech recognition not supported in this browser'}
                  >
                    {listening ? 'Stop' : '🎤 Speak'}
                  </button>
                </div>
              </div>

              <textarea rows={3} {...register('summary')} className={inputCls} />
              {!supported && (
                <p className="mt-1 text-xs text-slate-500">
                  Speech recognition isn’t supported in this browser. Try Chrome/Edge or iOS Safari 14+.
                </p>
              )}
              {error && (
                <p className="mt-1 text-xs text-rose-600">
                  Mic error: {String(error)}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Milestones (comma-separated)
              </label>
              <input
                {...register('milestones')}
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
              <input {...register('mealsOverview')} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Sleep overview</label>
              <input {...register('sleepOverview')} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hydration overview</label>
              <input {...register('hydrationOverview')} className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Notes (optional)">
          <textarea rows={4} {...register('notes')} className={inputCls} />
          {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
        </Section>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </Page>
  );
}
