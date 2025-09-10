// src/pages/CreateMonthly.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { toast } from 'sonner';

const schema = z.object({
  child: z.string().min(1, 'Child is required'),
  month: z.string().min(7, 'Month is required'), // YYYY-MM
  summary: z.string().optional(),
  milestones: z.string().optional(),           // comma-separated; split before submit
  mealsOverview: z.string().optional(),
  sleepOverview: z.string().optional(),
  hydrationOverview: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

export default function CreateMonthly() {
  const [children, setChildren] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      child: '',
      month: new Date().toISOString().slice(0, 7), // current YYYY-MM
    },
  });

  useEffect(() => {
    (async () => {
      // Admin route returns all children
      const res = await api.get('/children');
      setChildren(res.data || []);
      // Optional: preselect first child
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
      // go to its details page
      window.location.assign(`/reports/monthly/${res.data._id}`);
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
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create Monthly Report</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Child</label>
            <select {...register('child')} className="border p-2 w-full">
              <option value="">Select…</option>
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.child && (
              <p className="text-red-600 text-sm">{errors.child.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm">Month</label>
            <input type="month" {...register('month')} className="border p-2 w-full" />
            {errors.month && (
              <p className="text-red-600 text-sm">{errors.month.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Summary</label>
          <textarea rows={3} {...register('summary')} className="border p-2 w-full" />
        </div>

        <div>
          <label className="block text-sm mb-1">Milestones (comma-separated)</label>
          <input {...register('milestones')} className="border p-2 w-full" placeholder="e.g., Started counting to 10, Learned new song" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Meals overview</label>
            <input {...register('mealsOverview')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Sleep overview</label>
            <input {...register('sleepOverview')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Hydration overview</label>
            <input {...register('hydrationOverview')} className="border p-2 w-full" />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea rows={4} {...register('notes')} className="border p-2 w-full" />
          {errors.notes && <p className="text-red-600 text-sm">{errors.notes.message}</p>}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => history.back()} className="border rounded px-3 py-2">
            Cancel
          </button>
          <button disabled={isSubmitting} className="border rounded px-3 py-2">
            {isSubmitting ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
