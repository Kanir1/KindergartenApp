// src/pages/EditReport.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { toast } from 'sonner';

// ----- Schemas -----
const dailySchema = z.object({
  meals: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      snack: z.string().optional(),
    })
    .optional(),
  hydration: z
    .object({
      status: z.enum(['yes', 'no']).optional(),
      cups: z.coerce.number().int().min(0).max(10).optional(),
    })
    .optional(),
  // keep sleep optional; we'll only render it for post-sleep and drop it from payload otherwise
  sleep: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      minutes: z.coerce.number().int().min(0).optional(),
    })
    .optional(),
  notes: z.string().max(2000).optional(),
});

const monthlySchema = z.object({
  summary: z.string().optional(),
  milestones: z.string().optional(), // comma-separated in UI; split before submit
  mealsOverview: z.string().optional(),
  sleepOverview: z.string().optional(),
  hydrationOverview: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

// ----- Small UI helpers -----
function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Header({ title }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
      <Link
        to="/reports"
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ← Back to reports
      </Link>
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

export default function EditReport() {
  const { kind, id } = useParams(); // kind: 'daily' | 'monthly'
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report', kind, id],
    queryFn: async () => (await api.get(`/${kind}/${id}`)).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const schema = kind === 'daily' ? dailySchema : monthlySchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  // Initialize form when data arrives
  useEffect(() => {
    if (!data) return;
    if (kind === 'daily') {
      reset({
        meals: data.meals || {},
        hydration: data.hydration || {},
        // we set sleep only if this report is post-sleep; for pre-sleep we leave it undefined
        ...(data.type === 'postSleep' ? { sleep: data.sleep || {} } : {}),
        notes: data.notes || '',
      });
    } else {
      reset({
        summary: data.summary || '',
        milestones: Array.isArray(data.milestones) ? data.milestones.join(', ') : '',
        mealsOverview: data.mealsOverview || '',
        sleepOverview: data.sleepOverview || '',
        hydrationOverview: data.hydrationOverview || '',
        notes: data.notes || '',
      });
    }
  }, [data, kind, reset]);

  const onSubmit = async (values) => {
    try {
      const payload = { ...values };

      if (kind === 'monthly' && typeof values.milestones === 'string') {
        payload.milestones = values.milestones
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      // ❗ If this is a DAILY *pre-sleep* report, make sure we don't send any sleep field
      if (kind === 'daily' && data?.type !== 'postSleep') {
        delete payload.sleep;
      }

      await api.put(`/${kind}/${id}`, payload);
      toast.success('Report updated');
      qc.invalidateQueries({ queryKey: ['report', kind, id] });
      qc.invalidateQueries({ queryKey: [kind] });
      nav(`/reports/${kind}/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Update failed');
    }
  };

  if (isLoading) return <Page><div className="p-4">Loading…</div></Page>;
  if (isError) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || 'Request failed';
    return (
      <Page>
        <div className="p-4 text-rose-700 space-y-2 rounded-2xl border border-rose-200 bg-rose-50">
          <div className="font-medium">Failed to load.</div>
          <div className="text-sm">Kind: <code>{String(kind)}</code></div>
          <div className="text-sm">ID: <code>{String(id)}</code></div>
          {status && <div className="text-sm">HTTP {status}</div>}
          <div className="text-sm">{msg}</div>
          <Link className="underline" to="/reports">Back to reports</Link>
        </div>
      </Page>
    );
  }
  if (!data) return <Page><div className="p-4">Not found</div></Page>;

  const isDaily = kind === 'daily';
  const isPostSleep = isDaily && data?.type === 'postSleep'; // ✅ only show Sleep when true
  const title =
    kind === 'daily'
      ? `Edit Daily Report (${data.type === 'preSleep' ? 'Pre-sleep' : 'Post-sleep'})`
      : 'Edit Monthly Report';

  return (
    <Page>
      <Header title={title} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isDaily ? (
          <>
            <Section title="Meals">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input placeholder="Breakfast" {...register('meals.breakfast')} className={inputCls} />
                <input placeholder="Lunch" {...register('meals.lunch')} className={inputCls} />
                <input placeholder="Snack" {...register('meals.snack')} className={inputCls} />
              </div>
            </Section>

            <Section title="Hydration">
              <div className="flex flex-wrap items-center gap-3">
                <select {...register('hydration.status')} className={inputCls}>
                  <option value="">—</option>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
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
            </Section>

            {/* ✅ Only render Sleep for POST-SLEEP reports */}
            {isPostSleep && (
              <Section title="Sleep">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input type="datetime-local" {...register('sleep.start')} className={inputCls} />
                  <input type="datetime-local" {...register('sleep.end')} className={inputCls} />
                  <input type="number" min={0} placeholder="Minutes" {...register('sleep.minutes')} className={inputCls} />
                </div>
                {errors?.sleep?.minutes && (
                  <p className="mt-2 text-sm text-rose-600">{errors.sleep.minutes.message}</p>
                )}
              </Section>
            )}

            <Section title="Notes">
              <textarea rows={4} {...register('notes')} className={inputCls} />
              {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
            </Section>
          </>
        ) : (
          <>
            <Section title="Summary">
              <textarea rows={3} {...register('summary')} className={inputCls} />
            </Section>

            <Section title="Milestones (comma-separated)">
              <input {...register('milestones')} className={inputCls} placeholder="e.g., Started counting to 10, Learned new song" />
            </Section>

            <Section title="Overviews">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input placeholder="Meals overview" {...register('mealsOverview')} className={inputCls} />
                <input placeholder="Sleep overview" {...register('sleepOverview')} className={inputCls} />
                <input placeholder="Hydration overview" {...register('hydrationOverview')} className={inputCls} />
              </div>
            </Section>

            <Section title="Notes">
              <textarea rows={4} {...register('notes')} className={inputCls} />
              {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
            </Section>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Page>
  );
}
