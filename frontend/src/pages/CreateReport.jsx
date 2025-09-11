// src/pages/CreateReport.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import PhotoUploader from '../components/PhotoUploader';
import { useNavigate } from 'react-router-dom';

const hydrationOpt = ['yes', 'no'];

const schema = z.object({
  type: z.enum(['pre', 'post']),
  child: z.string().min(1, 'Child is required'),
  date: z.string(),
  meals: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      snack: z.string().optional(),
    })
    .optional(),
  hydration: z
    .object({
      status: z.enum(['yes', 'no']),
      cups: z.coerce.number().int().min(0).max(10),
    })
    .optional(),
  sleep: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      minutes: z.coerce.number().int().min(0).optional(),
    })
    .optional(),
  notes: z.string().max(2000).optional(),
});

// local YYYY-MM-DD
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
const MAX_DATE = todayLocalISO();

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
function Segmented({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
      {['pre', 'post'].map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
            value === k ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          {k === 'pre' ? 'Pre-sleep' : 'Post-sleep'}
        </button>
      ))}
    </div>
  );
}
const inputCls =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function CreateReport() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [children, setChildren] = useState([]);
  const [photos, setPhotos] = useState([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'pre',
      date: MAX_DATE,
      hydration: { status: 'yes', cups: 0 },
      child: '',
    },
  });

  const type = watch('type');
  const selectedChild = watch('child');

  useEffect(() => {
    (async () => {
      if (user?.role === 'admin') {
        const res = await api.get('/children');
        setChildren(res.data || []);
      } else {
        const res = await api.get('/children/mine');
        setChildren(res.data || []);
        if (res.data && res.data[0]?._id) setValue('child', res.data[0]._id);
      }
    })();
  }, [user?.role, setValue]);

  const onSubmit = async (data) => {
    const payload = { ...data, photos: photos.map((p) => p.url) };
    const path = data.type === 'pre' ? '/daily/pre' : '/daily/post';
    const res = await api.post(path, payload);
    alert('Created report: ' + res.data._id);
    nav(`/reports?tab=daily&child=${data.child}`);
  };

  // clamp date if user picks a future one
  const dateVal = watch('date');
  useEffect(() => {
    if (dateVal && dateVal > MAX_DATE) setValue('date', MAX_DATE);
  }, [dateVal, setValue]);

  return (
    <Page>
      <Header
        title="Create Daily Report"
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

      {/* ✅ FORM wraps everything, including the buttons */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type + basics */}
        <Section title="Basics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
              <Segmented value={type} onChange={(v) => setValue('type', v)} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input type="date" max={MAX_DATE} {...register('date')} className={inputCls} />
            </div>

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
                <p className="mt-1 text-sm text-rose-600">
                  {errors.child.message || 'Child required'}
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Meals */}
        <Section title="Meals">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder="Breakfast" {...register('meals.breakfast')} className={inputCls} />
            <input placeholder="Lunch" {...register('meals.lunch')} className={inputCls} />
            <input placeholder="Snack" {...register('meals.snack')} className={inputCls} />
          </div>
        </Section>

        {/* Hydration */}
        <Section title="Hydration">
          <div className="flex flex-wrap items-center gap-3">
            <select {...register('hydration.status')} className={inputCls}>
              {hydrationOpt.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={10}
              placeholder="Cups"
              {...register('hydration.cups')}
              className={`${inputCls} w-28`}
            />
          </div>
          {errors?.hydration?.cups && (
            <p className="mt-2 text-sm text-rose-600">{errors.hydration.cups.message}</p>
          )}
        </Section>

        {/* Sleep (post only) */}
        {type === 'post' && (
          <Section title="Sleep">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
                <input type="datetime-local" {...register('sleep.start')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
                <input type="datetime-local" {...register('sleep.end')} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Minutes</label>
                <input type="number" min={0} {...register('sleep.minutes')} className={inputCls} />
              </div>
            </div>
            {errors?.sleep?.minutes && (
              <p className="mt-2 text-sm text-rose-600">{errors.sleep.minutes.message}</p>
            )}
          </Section>
        )}

        {/* Photos */}
        <Section title="Photos (optional)">
          <PhotoUploader childId={selectedChild} onDone={(arr) => setPhotos(arr)} />
          {!!photos.length && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((p, i) => (
                <img key={i} src={p.url} alt="uploaded" className="h-28 w-full rounded object-cover" />
              ))}
            </div>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notes (optional)">
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Anything you'd like to add…"
            className={inputCls}
          />
          {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
        </Section>

        {/* ✅ Buttons are INSIDE the form now */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedChild}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Create report'}
          </button>
        </div>
      </form>
    </Page>
  );
}
