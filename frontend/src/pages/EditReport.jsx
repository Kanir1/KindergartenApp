// src/pages/EditReport.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { toast } from 'sonner';

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

// --- small UI helpers ---
function Page({ children }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
function Header({ title, children }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
      <div className="flex gap-2">{children}</div>
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
  const { kind, id } = useParams(); // 'daily' | 'monthly'
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
        sleep: data.sleep || {},
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
      await api.put(`/${kind}/${id}`, payload);
      toast.success('Report updated');
      qc.invalidateQueries({ queryKey: ['report', kind, id] });
      qc.invalidateQueries({ queryKey: [kind] });
      nav(`/reports/${kind}/${id}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Update failed');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <Page>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        </div>
      </Page>
    );
  }

  // Error
  if (isError) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || 'Request failed';
    return (
      <Page>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <div className="font-semibold">Failed to load.</div>
          <div className="mt-1 text-sm opacity-80">
            Kind: <code>{String(kind)}</code>
          </div>
          <div className="text-sm opacity-80">
            ID: <code>{String(id)}</code>
          </div>
          {status && <div className="text-sm opacity-80">HTTP {status}</div>}
          <div className="text-sm opacity-80">{msg}</div>
          <div className="mt-3">
            <Link
              className="rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
              to="/reports"
            >
              ← Back to reports
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  if (!data) return <Page><div className="p-4">Not found</div></Page>;

  return (
    <Page>
      <Header title={`Edit ${kind === 'daily' ? 'Daily' : 'Monthly'} Report`}>
        <button
          type="button"
          onClick={() => nav(-1)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </button>
      </Header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {kind === 'daily' ? (
          <>
            <Section title="Meals">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              {errors?.hydration?.cups && (
                <p className="mt-2 text-sm text-rose-600">{errors.hydration.cups.message}</p>
              )}
            </Section>

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

            <Section title="Notes">
              <textarea rows={4} {...register('notes')} className={inputCls} />
              {errors.notes && <p className="mt-2 text-sm text-rose-600">{errors.notes.message}</p>}
            </Section>
          </>
        ) : (
          <>
            <Section title="Overview">
              <div className="grid grid-cols-1 gap-3">
                <input placeholder="Summary" {...register('summary')} className={inputCls} />
                <input placeholder="Milestones (comma-separated)" {...register('milestones')} className={inputCls} />
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
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Page>
  );
}
