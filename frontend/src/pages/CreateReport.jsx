// src/pages/CreateReport.jsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import PhotoUploader from '../components/PhotoUploader';

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
      start: z.string(),
      end: z.string(),
      minutes: z.coerce.number().int().min(0),
    })
    .optional(),
    notes: z.string().max(2000).optional(),
});

export default function CreateReport() {
  const { user } = useAuth();
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
      date: new Date().toISOString().slice(0, 10),
      hydration: { status: 'yes', cups: 0 },
      child: '',
    },
  });

  const type = watch('type');

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
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create Daily Report</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="flex gap-2">
          <label className="flex items-center gap-1">
            <input type="radio" value="pre" {...register('type')} /> Pre-sleep
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" value="post" {...register('type')} /> Post-sleep
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Date</label>
            <input type="date" {...register('date')} className="border p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm">Child</label>
            <select {...register('child')} className="border p-2 w-full">
              <option value="">Select...</option>
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.child && (
              <p className="text-red-600 text-sm">{errors.child.message || 'Child required'}</p>
            )}
          </div>
        </div>

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
              className="border p-2 w-24"
            />
          </div>
        </fieldset>

        {type === 'post' && (
          <fieldset className="border p-3 rounded">
            <legend className="px-1">Sleep</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="datetime-local" {...register('sleep.start')} className="border p-2" />
              <input type="datetime-local" {...register('sleep.end')} className="border p-2" />
              <input
                type="number"
                min={0}
                placeholder="Minutes"
                {...register('sleep.minutes')}
                className="border p-2"
              />
            </div>
          </fieldset>
        )}

        <div className="space-y-2">
          <label className="block text-sm">Photos (optional)</label>
          <PhotoUploader childId={watch('child')} onDone={(arr) => setPhotos(arr)} />
          {!!photos.length && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p.url} alt="uploaded" className="w-full h-24 object-cover rounded" />
              ))}
            </div>
          )}
        </div>


        <div>
        <label className="block text-sm mb-1">Notes (optional)</label>
        <textarea
            {...register('notes')}
            rows={4}
            placeholder="Anything you'd like to add..."
            className="border p-2 w-full"
        />
        {errors.notes && <p className="text-red-600 text-sm">{errors.notes.message}</p>}
        </div>

        <button disabled={isSubmitting} className="border rounded px-3 py-2">
          {isSubmitting ? 'Saving...' : 'Create report'}
        </button>
      </form>
    </div>
  );
}
