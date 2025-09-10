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
  meals: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    snack: z.string().optional(),
  }).optional(),
  hydration: z.object({
    status: z.enum(['yes','no']).optional(),
    cups: z.coerce.number().int().min(0).max(10).optional(),
  }).optional(),
  sleep: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    minutes: z.coerce.number().int().min(0).optional(),
  }).optional(),
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
    formState: { isSubmitting, errors }
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
          .map(s => s.trim())
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

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (isError) {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message || error?.message || 'Request failed';
    return (
      <div className="p-4 text-red-600 space-y-2">
        <div>Failed to load.</div>
        <div className="text-sm opacity-80">Kind: <code>{String(kind)}</code></div>
        <div className="text-sm opacity-80">ID: <code>{String(id)}</code></div>
        {status && <div className="text-sm opacity-80">HTTP {status}</div>}
        <div className="text-sm opacity-80">{msg}</div>
        <Link className="underline" to="/reports">Back to reports</Link>
      </div>
    );
  }

  if (!data) return <div className="p-4">Not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Edit {kind === 'daily' ? 'Daily' : 'Monthly'} Report</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {kind === 'daily' ? (
          <>
            <fieldset className="border p-3 rounded">
              <legend className="px-1">Meals</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input placeholder="Breakfast" {...register('meals.breakfast')} className="border p-2" />
                <input placeholder="Lunch" {...register('meals.lunch')} className="border p-2" />
                <input placeholder="Snack" {...register('meals.snack')} className="border p-2" />
              </div>
            </fieldset>

            <fieldset className="border p-3 rounded">
              <legend className="px-1">Hydration</legend>
              <div className="flex gap-3 items-center">
                <select {...register('hydration.status')} className="border p-2">
                  <option value="">—</option>
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
                <input type="number" min={0} max={10} placeholder="Cups" {...register('hydration.cups')} className="border p-2 w-24" />
              </div>
            </fieldset>

            <fieldset className="border p-3 rounded">
              <legend className="px-1">Sleep</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="datetime-local" {...register('sleep.start')} className="border p-2" />
                <input type="datetime-local" {...register('sleep.end')} className="border p-2" />
                <input type="number" min={0} placeholder="Minutes" {...register('sleep.minutes')} className="border p-2" />
              </div>
            </fieldset>

            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea rows={4} {...register('notes')} className="border p-2 w-full" />
              {errors.notes && <p className="text-red-600 text-sm">{errors.notes.message}</p>}
            </div>
          </>
        ) : (
          <>
            <input placeholder="Summary" {...register('summary')} className="border p-2 w-full" />
            <input placeholder="Milestones (comma-separated)" {...register('milestones')} className="border p-2 w-full" />
            <input placeholder="Meals overview" {...register('mealsOverview')} className="border p-2 w-full" />
            <input placeholder="Sleep overview" {...register('sleepOverview')} className="border p-2 w-full" />
            <input placeholder="Hydration overview" {...register('hydrationOverview')} className="border p-2 w-full" />
            <div>
              <label className="block text-sm mb-1">Notes</label>
              <textarea rows={4} {...register('notes')} className="border p-2 w-full" />
              {errors.notes && <p className="text-red-600 text-sm">{errors.notes.message}</p>}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => nav(-1)} className="border rounded px-3 py-2">
            Cancel
          </button>
          <button disabled={isSubmitting} className="border rounded px-3 py-2">
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
