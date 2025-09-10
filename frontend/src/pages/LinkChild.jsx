import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../api/client';
import { toast } from 'sonner';

const schema = z.object({
  externalId: z.string().min(1, 'Child ID required'),
  name: z.string().min(1, 'Child name required'),
  birthDate: z.string().optional(),
});

export default function LinkChild() {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values) => {
    try {
      await api.post('/parents/link-child', values);
      toast.success('Child linked');
      reset();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to link child');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-3">
      <h1 className="text-xl font-semibold">Link Child</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm">Child ID</label>
          <input className="border p-2 w-full" {...register('externalId')} placeholder="e.g., A12-345" />
          {errors.externalId && <p className="text-red-600 text-sm">{errors.externalId.message}</p>}
        </div>
        <div>
          <label className="block text-sm">Child Name</label>
          <input className="border p-2 w-full" {...register('name')} placeholder="e.g., Tommy" />
          {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm">Birth Date (optional)</label>
          <input type="date" className="border p-2 w-full" {...register('birthDate')} />
        </div>
        <button disabled={isSubmitting} className="border rounded px-3 py-2">
          {isSubmitting ? 'Linking…' : 'Link child'}
        </button>
      </form>
      <p className="text-xs opacity-70">
        If the Child ID exists and is unlinked, it will be linked. If it doesn’t exist, a new child will be created.
      </p>
    </div>
  );
}
