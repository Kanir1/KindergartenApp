// src/pages/Register.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthProvider';

// Local timezone-safe YYYY-MM-DD
function todayLocalISO() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const schema = z.object({
  name: z.string().min(1, 'Your name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'At least 6 characters'),
  childName: z.string().min(1, 'Child name is required'),
  childExternalId: z.string().min(1, 'Child ID is required'),
  birthDate: z
    .string()
    .optional()
    .refine((val) => !val || val <= todayLocalISO(), { message: 'Birth date cannot be in the future' }),
});

export default function Register() {
  const { setToken, setUser } = useAuth();
  const nav = useNavigate();
  const [serverErr, setServerErr] = useState('');
  const [dateNote, setDateNote] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    resolver: zodResolver(schema),
  });

  const maxDate = todayLocalISO();

  const onSubmit = async (data) => {
    try {
      setServerErr('');
      const birthDate = data.birthDate || undefined;
      const idVal = data.childExternalId.trim();

      const payload = {
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: 'parent',
        newChild: {
          name: data.childName.trim(),
          externalId: idVal, // for schemas using externalId
          childId: idVal,    // for schemas using childId
          birthDate,
        },
      };
      const res = await api.post('/auth/register', payload);
      setToken(res.data.token);
      setUser(res.data.user);
      nav('/my-children');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Registration failed';
      setServerErr(msg);
      console.error(err);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex items-center">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Parent Registration</h1>
          <p className="mt-1 text-sm text-slate-500">Create your account and your first child.</p>

          {serverErr && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{serverErr}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Your Name</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Full name"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="mt-1 text-sm text-rose-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>}
            </div>

            <hr className="my-2" />

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Child Name</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Tommy"
                {...register('childName')}
                aria-invalid={!!errors.childName}
              />
              {errors.childName && <p className="mt-1 text-sm text-rose-600">{errors.childName.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Child ID</label>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., A12-345"
                {...register('childExternalId')}
                aria-invalid={!!errors.childExternalId}
              />
              {errors.childExternalId && <p className="mt-1 text-sm text-rose-600">{errors.childExternalId.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Birth Date (optional)</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                max={maxDate}
                {...register('birthDate', {
                  onChange: (e) => {
                    const v = e.target.value;
                    if (v && v > maxDate) {
                      setValue('birthDate', maxDate, { shouldValidate: true });
                      setDateNote('Birth date cannot be in the future. Adjusted to today.');
                    } else {
                      setDateNote('');
                    }
                  },
                })}
                aria-invalid={!!errors.birthDate}
              />
              {errors.birthDate && <p className="mt-1 text-sm text-rose-600">{errors.birthDate.message}</p>}
              {dateNote && !errors.birthDate && <p className="mt-1 text-xs text-amber-600">{dateNote}</p>}
            </div>

            <button
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Registering…' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}